import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { fulfilOrder } from "@/lib/order";

// Integration tests against real Postgres — fulfilOrder's correctness lives
// entirely in how it behaves under concurrent/duplicate calls against real
// row locking, which an in-memory mock of Prisma couldn't exercise
// meaningfully. See tests/unit/session-rotation.test.ts for the same
// rationale applied to refresh-token rotation.

let categoryId: string;
let productId: string;
let variantId: string;
let cartId: string;
let orderId: string;
let razorpayOrderId: string;
const STARTING_STOCK = 5;
const UNIT_PRICE_PAISE = 79900;
const QUANTITY = 2;
const TOTAL_PAISE = UNIT_PRICE_PAISE * QUANTITY;

beforeEach(async () => {
  const suffix = crypto.randomUUID();
  razorpayOrderId = `order_test_${suffix}`;

  const category = await prisma.category.create({
    data: { slug: `cat-${suffix}`, name: "Test Category" },
  });
  categoryId = category.id;

  const product = await prisma.product.create({
    data: {
      slug: `product-${suffix}`,
      title: "Test Hijab",
      description: "A test product",
      categoryId,
      fabric: "Test Fabric",
      basePricePaise: UNIT_PRICE_PAISE,
      status: "ACTIVE",
    },
  });
  productId = product.id;

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: `SKU-${suffix}`,
      colorName: "Black",
      colorHex: "#111111",
      stock: STARTING_STOCK,
    },
  });
  variantId = variant.id;

  const cart = await prisma.cart.create({
    data: { sessionToken: `cart-${suffix}`, expiresAt: new Date(Date.now() + 86400000) },
  });
  cartId = cart.id;
  await prisma.cartItem.create({ data: { cartId, variantId, quantity: QUANTITY } });

  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-${suffix}`,
      email: "shopper@example.com",
      phone: "9876543210",
      status: "PENDING",
      subtotalPaise: TOTAL_PAISE,
      totalPaise: TOTAL_PAISE,
      cartId,
      razorpayOrderId,
      shippingAddress: {
        fullName: "Test",
        line1: "1 Test St",
        city: "Test City",
        state: "TS",
        pincode: "123456",
      },
      billingAddress: {
        fullName: "Test",
        line1: "1 Test St",
        city: "Test City",
        state: "TS",
        pincode: "123456",
      },
      items: {
        create: [
          {
            variantId,
            productTitle: "Test Hijab",
            variantLabel: "Black",
            sku: `SKU-${suffix}`,
            unitPricePaise: UNIT_PRICE_PAISE,
            quantity: QUANTITY,
          },
        ],
      },
    },
  });
  orderId = order.id;
});

afterEach(async () => {
  await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  await prisma.cart.delete({ where: { id: cartId } }).catch(() => {});
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
});

function fulfil(paymentId: string) {
  return fulfilOrder({
    razorpayOrderId,
    razorpayPaymentId: paymentId,
    method: "card",
    amountPaise: TOTAL_PAISE,
    rawPayload: { test: true },
  });
}

describe("fulfilOrder", () => {
  it("marks the order paid, decrements stock, and clears the cart", async () => {
    await fulfil("pay_test_1");

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID");
    expect(order.paidAt).not.toBeNull();
    expect(order.needsReview).toBe(false);

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY);

    const cartItems = await prisma.cartItem.findMany({ where: { cartId } });
    expect(cartItems).toHaveLength(0);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe("CAPTURED");
  });

  it("is idempotent: calling it again with the same payment does nothing further", async () => {
    await fulfil("pay_test_2");
    await fulfil("pay_test_2"); // webhook redelivery / callback+webhook race, same payment id

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY); // decremented exactly once
  });

  it("is idempotent even with a different payment id on the replay (still one Payment row)", async () => {
    await fulfil("pay_test_3");
    // A hypothetical second attempt with a *different* payment id against
    // an order that's already PAID — the status claim (WHERE status =
    // 'PENDING') is what stops this, not the payment id.
    await fulfil("pay_test_3_different_id");

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.razorpayPaymentId).toBe("pay_test_3");

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY);
  });

  it("handles two concurrent calls racing for the same order without double-decrementing stock", async () => {
    const [a, b] = await Promise.allSettled([fulfil("pay_race_a"), fulfil("pay_race_b")]);
    expect(a.status).toBe("fulfilled");
    expect(b.status).toBe("fulfilled");

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1); // only one of the two payment ids actually got recorded

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY);
  });

  it("flags needsReview instead of throwing when stock can't cover the order", async () => {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 1 } }); // less than QUANTITY

    await fulfil("pay_test_oversold");

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID"); // payment is never dropped
    expect(order.needsReview).toBe(true);

    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    expect(variant.stock).toBe(1); // left untouched — the conditional decrement never fired
  });

  it("rejects an amount that doesn't match the order total", async () => {
    await fulfilOrder({
      razorpayOrderId,
      razorpayPaymentId: "pay_wrong_amount",
      method: "card",
      amountPaise: TOTAL_PAISE + 1,
      rawPayload: {},
    });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PENDING"); // never claimed
    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(0);
  });

  it("no-ops for an unknown razorpayOrderId instead of throwing", async () => {
    await expect(
      fulfilOrder({
        razorpayOrderId: "order_does_not_exist",
        razorpayPaymentId: "pay_orphan",
        method: null,
        amountPaise: 100,
        rawPayload: {},
      }),
    ).resolves.toBeUndefined();
  });
});
