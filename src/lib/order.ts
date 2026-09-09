import "server-only";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon";
import { calculateShippingPaise } from "@/lib/shipping";
import { createRazorpayOrder } from "@/lib/razorpay";
import { sendOrderConfirmationEmail } from "@/lib/email";
import type { Prisma } from "@/generated/prisma/client";

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
};

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      razorpayOrderId: string;
      amountPaise: number;
    }
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

  const shippingPaise = calculateShippingPaise(cart.subtotalPaise);
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

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      status: "PENDING",
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

    return order.id;
  });

  if (!claimed) return; // idempotent no-op — nothing new happened, nothing to react to

  // The payment is captured and stock is decremented at this point — that
  // must never be undone by a problem with post-processing. Both
  // revalidateTag and after() require an active Next.js request scope
  // (Server Action / Route Handler) and throw a hard error without one;
  // fulfilOrder itself has no such requirement (it's plain business
  // logic, exercised directly by integration tests), so both calls are
  // guarded rather than left to potentially fail this function after the
  // real work already succeeded.
  try {
    // "minutes" (not the docs' recommended "max") because stock just
    // changed — product pages should reflect it soon, not whenever the
    // default catalog cache next happens to turn over.
    revalidateTag("products", "minutes");
  } catch (error) {
    console.error("[order] revalidateTag failed", error);
  }

  const sendConfirmation = async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: claimed },
        include: { items: true },
      });
      if (order) await sendOrderConfirmationEmail(order);
    } catch (error) {
      console.error("[order] failed to send confirmation email", error);
    }
  };
  try {
    after(sendConfirmation);
  } catch {
    // No request scope available (e.g. called from a script or test) —
    // fall back to firing it without the after() guarantees rather than
    // dropping the email entirely.
    void sendConfirmation();
  }
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
