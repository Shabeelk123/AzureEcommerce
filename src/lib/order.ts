import "server-only";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon";
import { calculateShippingPaise } from "@/lib/shipping";
import { createRazorpayOrder, createRazorpayRefund } from "@/lib/razorpay";
import {
  sendOrderCancelledEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendRefundInitiatedEmail,
} from "@/lib/email";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

/**
 * Runs `task` after the response is sent (next/server's `after()`), which
 * requires an active Server Action / Route Handler request scope and
 * throws a hard synchronous error without one. The order mutation this
 * follows has already committed by the time we get here, so a missing
 * request scope (a script, a test, or any future caller) must never
 * surface as a failure of the mutation itself — fall back to firing the
 * task without after()'s guarantees instead.
 */
function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  // See prisma/migrations/.../add_order_number_sequence — nextval() is
  // atomic across concurrent transactions, unlike "read the current max
  // and add one".
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('order_number_seq') AS nextval
  `;
  const n = rows[0]?.nextval ?? BigInt(0);
  return `AZH-${year}-${n.toString().padStart(6, "0")}`;
}

export type AddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type PlaceOrderInput = AddressInput & {
  userId: string | null;
  email: string;
  couponCode?: string;
  paymentMethod?: "RAZORPAY" | "COD";
};

export type PlaceOrderResult =
  | {
      ok: true;
      method: "razorpay";
      orderId: string;
      orderNumber: string;
      razorpayOrderId: string;
      amountPaise: number;
    }
  | { ok: true; method: "cod"; orderId: string; orderNumber: string }
  | { ok: false; reason: string };

/**
 * Creates a PENDING Order + OrderItems from the current cart and a
 * matching Razorpay order. Every price comes from the DB via getCart()
 * (which itself re-resolves each variant's live price and stock) — the
 * client never supplies an amount that ends up charged.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const cart = await getCart();
  if (cart.lines.length === 0 || !cart.id) {
    return { ok: false, reason: "Your cart is empty." };
  }
  if (cart.hasIssues) {
    return {
      ok: false,
      reason:
        "Some items in your cart changed. Please review your cart before checking out.",
    };
  }

  let discountPaise = 0;
  let couponCode: string | undefined;
  if (input.couponCode) {
    const result = await validateCoupon(input.couponCode, cart.subtotalPaise);
    if (!result.ok) return { ok: false, reason: result.reason };
    discountPaise = result.discountPaise;
    couponCode = result.coupon.code;
  }

  const shippingPaise = await calculateShippingPaise(cart.subtotalPaise);
  const totalPaise = cart.subtotalPaise - discountPaise + shippingPaise;
  if (totalPaise <= 0) {
    return { ok: false, reason: "Order total must be greater than zero." };
  }

  const addressSnapshot = {
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? null,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    country: "IN",
  } satisfies Prisma.InputJsonValue;

  const orderNumber = await generateOrderNumber();
  const paymentMethod = input.paymentMethod ?? "RAZORPAY";

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      status: "PENDING",
      paymentMethod,
      subtotalPaise: cart.subtotalPaise,
      discountPaise,
      shippingPaise,
      totalPaise,
      couponCode,
      cartId: cart.id,
      shippingAddress: addressSnapshot,
      billingAddress: addressSnapshot,
      items: {
        create: cart.lines.map((line) => ({
          variantId: line.variantId,
          productTitle: line.productTitle,
          variantLabel: line.variantLabel,
          sku: line.sku,
          unitPricePaise: line.unitPricePaise,
          quantity: line.effectiveQuantity,
          imageUrl: line.imageUrl,
        })),
      },
    },
  });

  // COD has no gateway to wait on — the order is confirmed (stock
  // committed) synchronously here, the same work fulfilOrder() does for a
  // captured Razorpay payment, just without a Payment row since no money
  // has actually changed hands yet.
  if (paymentMethod === "COD") {
    await confirmCodOrder(order.id);
    return { ok: true, method: "cod", orderId: order.id, orderNumber };
  }

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountPaise: totalPaise,
      receipt: orderNumber,
      notes: { orderId: order.id },
    });
  } catch (error) {
    // The PENDING order row is left in place — harmless (see the "orphaned
    // PENDING orders" note in the checkout action), and lets us avoid
    // holding a DB transaction open across a network call to Razorpay.
    console.error("[order] Razorpay order creation failed", error);
    return { ok: false, reason: "Couldn't start payment. Please try again." };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  return {
    ok: true,
    method: "razorpay",
    orderId: order.id,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amountPaise: totalPaise,
  };
}

export type FulfilOrderInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  method: string | null;
  amountPaise: number;
  rawPayload: unknown;
};

/**
 * The one place an order is ever marked PAID and stock ever decremented
 * for a sale. Called from both the browser-callback action and the
 * webhook route — either can win the race, and both must be safe to call
 * for the same payment more than once (network retries, the webhook and
 * the callback both firing, a webhook redelivery that slips past the
 * WebhookEvent dedupe).
 *
 * Idempotency hinges on one atomic statement: `UPDATE Order SET
 * status = 'PAID' WHERE id = ? AND status = 'PENDING'`. Postgres's
 * row-level locking on UPDATE makes this safe as a mutex even under the
 * default READ COMMITTED isolation — a second concurrent UPDATE against
 * the same row blocks until the first commits, then re-evaluates its own
 * WHERE clause against the now-committed row and affects zero rows. No
 * SERIALIZABLE transaction or explicit row lock needed; this is *why* the
 * claim happens as an UPDATE, not a SELECT-then-UPDATE.
 */
type TxClient = Prisma.TransactionClient;
type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

/**
 * The "commit" side of fulfilment, shared by both the Razorpay path
 * (fulfilOrder, below) and the COD path (confirmCodOrder) once each has
 * already won its own PENDING -> PAID claim: decrement stock per line
 * (flagging needsReview on a partial/failed decrement — money or a
 * confirmed COD promise is already committed at this point, so an
 * oversold line must never be silently dropped), increment coupon
 * redemption, and clear the cart the order was placed from.
 */
async function commitOrderStockAndCart(tx: TxClient, order: OrderWithItems): Promise<void> {
  let needsReview = false;
  for (const item of order.items) {
    if (!item.variantId) continue;
    const decrement = await tx.productVariant.updateMany({
      where: { id: item.variantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (decrement.count === 0) needsReview = true;
  }

  if (order.couponCode) {
    await tx.coupon.update({
      where: { code: order.couponCode },
      data: { redemptionCount: { increment: 1 } },
    });
  }

  if (needsReview) {
    await tx.order.update({ where: { id: order.id }, data: { needsReview: true } });
  }

  if (order.cartId) {
    await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
  }
}

/**
 * Shared post-commit side effects for both fulfilOrder and
 * confirmCodOrder: the underlying mutation (payment captured / COD
 * confirmed, stock decremented) has already succeeded by the time this
 * runs, so a problem here must never appear to undo it. Both
 * revalidateTag and after() require an active Next.js request scope
 * (Server Action / Route Handler) and throw a hard error without one;
 * these functions have no such requirement themselves (they're plain
 * business logic, exercised directly by integration tests), so both calls
 * are guarded rather than left to potentially fail the caller.
 */
function runPostFulfillmentSideEffects(orderId: string): void {
  try {
    // "minutes" (not the docs' recommended "max") because stock just
    // changed — product pages should reflect it soon, not whenever the
    // default catalog cache next happens to turn over.
    revalidateTag("products", "minutes");
  } catch (error) {
    console.error("[order] revalidateTag failed", error);
  }

  runAfterResponse(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (order) await sendOrderConfirmationEmail(order);
    } catch (error) {
      console.error("[order] failed to send confirmation email", error);
    }
  });
}

export async function fulfilOrder(input: FulfilOrderInput): Promise<void> {
  const claimed = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { items: true },
    });
    if (!order) {
      console.error(
        "[order] fulfilOrder: no order found for razorpayOrderId",
        input.razorpayOrderId,
      );
      return null;
    }

    // Defense in depth: signature verification already ensures this
    // payload really came from Razorpay for *some* order of ours, but a
    // forged notes.orderId or a mismatched amount should never be able to
    // fulfil an order it doesn't belong to. Never trust one layer alone.
    if (input.amountPaise !== order.totalPaise) {
      console.error("[order] fulfilOrder: amount mismatch", {
        orderId: order.id,
        expected: order.totalPaise,
        got: input.amountPaise,
      });
      return null;
    }

    const claim = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claim.count === 0) {
      return null; // already fulfilled (or otherwise not PENDING) by another call
    }

    try {
      await tx.payment.create({
        data: {
          orderId: order.id,
          razorpayPaymentId: input.razorpayPaymentId,
          method: input.method,
          amountPaise: input.amountPaise,
          status: "CAPTURED",
          capturedAt: new Date(),
          rawPayload: input.rawPayload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Unique constraint on razorpayPaymentId. We already won the status
      // claim above, so reaching this means the same payment id was
      // recorded between our read and write — extremely unlikely, but
      // treat as already-handled rather than throwing.
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return null;
      }
      throw error;
    }

    await commitOrderStockAndCart(tx, order);
    return order.id;
  });

  if (!claimed) return; // idempotent no-op — nothing new happened, nothing to react to
  runPostFulfillmentSideEffects(claimed);
}

/**
 * The COD equivalent of fulfilOrder — no gateway confirms payment, so
 * there's nothing to verify beyond "this is really a COD order still
 * awaiting confirmation." Uses the same atomic
 * `UPDATE ... WHERE status = 'PENDING'` claim as fulfilOrder for the same
 * reason: it's cheap, idempotent-by-construction insurance even though
 * COD orders (unlike Razorpay's webhook+callback race) only have one
 * caller today.
 */
export async function confirmCodOrder(orderId: string): Promise<void> {
  const claimed = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentMethod !== "COD") return null;

    const claim = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claim.count === 0) return null;

    await commitOrderStockAndCart(tx, order);
    return order.id;
  });

  if (!claimed) return;
  runPostFulfillmentSideEffects(claimed);
}

/**
 * Looked up by `id` (an unguessable cuid), never by the human-facing
 * `orderNumber` — that number is *sequential* ("AZH-2026-000042"), so
 * using it as a lookup key would let anyone enumerate every order in the
 * store just by walking the counter. The cuid effectively acts as a
 * bearer token for the confirmation page, the same way an unguessable
 * link stands in for auth on most guest order-tracking pages.
 *
 * An account-owned order still requires the requester to actually be that
 * account — the unguessable id is only a substitute for auth on *guest*
 * orders (userId null), not a bypass for someone else's account order
 * even if the id somehow leaked.
 */
export async function getOrderById(id: string, userId: string | null) {
  return prisma.order.findFirst({
    where: { id, OR: [{ userId: userId ?? "__no_session__" }, { userId: null }] },
    include: { items: true },
  });
}

// ---------------------------------------------------------------------------
// Order history (customer + admin)
// ---------------------------------------------------------------------------

/** A logged-in shopper's own order history — strict ownership, no guest fallback. */
export async function getOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    include: { items: true },
  });
}

export async function getOrderForCustomer(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, payments: { include: { refunds: true } } },
  });
}

export type AdminOrderFilters = {
  status?: OrderStatus;
  search?: string; // matches orderNumber or email
  page?: number;
};

const ADMIN_PAGE_SIZE = 20;

export async function getOrdersForAdmin(filters: AdminOrderFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.OrderWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { orderNumber: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

/** No ownership restriction — admin sees every order. */
export async function getOrderForAdmin(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { include: { refunds: true } } },
  });
}

// ---------------------------------------------------------------------------
// Admin order management
// ---------------------------------------------------------------------------

export class OrderActionError extends Error {}

// What an admin can explicitly set via the status dropdown. PENDING and
// PAID are system-managed (only fulfilOrder sets PAID); REFUNDED is only
// ever set by the refund.processed webhook once Razorpay confirms it —
// never optimistically by an admin action.
const ADMIN_SETTABLE_STATUSES = ["PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

// Which current statuses a given target may be reached from. Anything not
// listed as a source is rejected — this is enforced server-side inside the
// action, not just left to the UI only offering "sensible" options.
const ALLOWED_FROM: Record<AdminSettableStatus, OrderStatus[]> = {
  PACKED: ["PAID"],
  SHIPPED: ["PAID", "PACKED"],
  DELIVERED: ["SHIPPED"],
  // Once shipped, "cancel" no longer makes sense — that's a return/refund
  // handled through issueRefund instead, not a status rollback.
  CANCELLED: ["PENDING", "PAID", "PACKED"],
};

export function isAdminSettableStatus(status: string): status is AdminSettableStatus {
  return (ADMIN_SETTABLE_STATUSES as readonly string[]).includes(status);
}

/** For a plain status change (PACKED/DELIVERED) — SHIPPED and CANCELLED go through their own functions below, which also handle side effects. */
export async function updateOrderStatus(
  orderId: string,
  target: "PACKED" | "DELIVERED",
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderActionError("Order not found.");
  if (!ALLOWED_FROM[target].includes(order.status)) {
    throw new OrderActionError(`Can't mark a ${order.status} order as ${target}.`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: target,
      ...(target === "PACKED" ? { packedAt: new Date() } : {}),
      ...(target === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });
}

export async function markOrderShipped(
  orderId: string,
  tracking: { trackingNumber: string; carrier: string },
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderActionError("Order not found.");
  if (!ALLOWED_FROM.SHIPPED.includes(order.status)) {
    throw new OrderActionError(`Can't mark a ${order.status} order as SHIPPED.`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "SHIPPED",
      shippedAt: new Date(),
      trackingNumber: tracking.trackingNumber,
      carrier: tracking.carrier,
    },
  });

  runAfterResponse(async () => {
    try {
      await sendOrderShippedEmail({
        email: order.email,
        orderNumber: order.orderNumber,
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier,
      });
    } catch (error) {
      console.error("[order] failed to send shipped email", error);
    }
  });
}

export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new OrderActionError("Order not found.");
  if (!ALLOWED_FROM.CANCELLED.includes(order.status)) {
    throw new OrderActionError(`Can't cancel a ${order.status} order.`);
  }

  const capturedPayment = order.payments.find((p) => p.status === "CAPTURED");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      notes: reason ? `Cancelled: ${reason}` : order.notes,
    },
  });

  // Cancelling a paid order implies a full refund — this is the same
  // Razorpay call issueRefund makes below, just triggered automatically
  // rather than by a separate admin click.
  if (capturedPayment) {
    try {
      await createRazorpayRefund({
        razorpayPaymentId: capturedPayment.razorpayPaymentId,
        notes: { orderId: order.id, reason: reason ?? "Order cancelled" },
      });
    } catch (error) {
      console.error("[order] auto-refund on cancel failed — needs manual follow-up", error);
    }
  }

  runAfterResponse(async () => {
    try {
      await sendOrderCancelledEmail({ email: order.email, orderNumber: order.orderNumber });
    } catch (error) {
      console.error("[order] failed to send cancellation email", error);
    }
  });
}

export async function issueRefund(
  orderId: string,
  options: { amountPaise?: number; reason?: string } = {},
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new OrderActionError("Order not found.");

  const capturedPayment = order.payments.find((p) => p.status === "CAPTURED");
  if (!capturedPayment) {
    throw new OrderActionError("This order has no captured payment to refund.");
  }
  if (options.amountPaise != null && options.amountPaise > capturedPayment.amountPaise) {
    throw new OrderActionError("Refund amount can't exceed the captured payment.");
  }

  // Razorpay is the source of truth for whether this actually succeeds —
  // this call only *starts* it. Payment/Order status update to REFUNDED /
  // PARTIALLY_REFUNDED happens in the refund.processed webhook handler,
  // not here.
  await createRazorpayRefund({
    razorpayPaymentId: capturedPayment.razorpayPaymentId,
    amountPaise: options.amountPaise,
    notes: options.reason ? { reason: options.reason } : undefined,
  });

  runAfterResponse(async () => {
    try {
      await sendRefundInitiatedEmail({
        email: order.email,
        orderNumber: order.orderNumber,
        amountPaise: options.amountPaise ?? capturedPayment.amountPaise,
      });
    } catch (error) {
      console.error("[order] failed to send refund-initiated email", error);
    }
  });
}

/**
 * COD orders are marked PAID at placement (see confirmCodOrder) — that
 * status means "confirmed, stock committed", not "cash in hand". This is
 * the separate, explicit record of the cash actually being collected,
 * set by an admin after delivery. There is deliberately no automatic path
 * to this — unlike a Razorpay capture, no system on our side can observe
 * a COD handoff happening.
 */
export async function markCodCollected(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderActionError("Order not found.");
  if (order.paymentMethod !== "COD") {
    throw new OrderActionError("This order isn't a Cash on Delivery order.");
  }
  if (order.codCollectedAt) {
    throw new OrderActionError("Cash has already been marked as collected for this order.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { codCollectedAt: new Date() },
  });
}
