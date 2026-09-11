import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { confirmCodOrder, markCodCollected, OrderActionError } from "@/lib/order";

// Same integration-test rationale as fulfil-order.test.ts: correctness
// here lives in real row locking (the atomic PENDING -> PAID claim), which
// an in-memory mock of Prisma couldn't exercise meaningfully.

let categoryId: string;
let productId: string;
let variantId: string;
let cartId: string;
let orderId: string;
const STARTING_STOCK = 5;
const UNIT_PRICE_PAISE = 79900;
const QUANTITY = 2;
const TOTAL_PAISE = UNIT_PRICE_PAISE * QUANTITY;

async function createOrder(paymentMethod: "COD" | "RAZORPAY", status: "PENDING" | "PAID" = "PENDING") {
  const suffix = crypto.randomUUID();

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
      status,
      paymentMethod,
      subtotalPaise: TOTAL_PAISE,
      totalPaise: TOTAL_PAISE,
      cartId,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
      shippingAddress: { fullName: "Test", line1: "1 Test St", city: "X", state: "Y", pincode: "123456" },
      billingAddress: { fullName: "Test", line1: "1 Test St", city: "X", state: "Y", pincode: "123456" },
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
  return orderId;
}

afterEach(async () => {
  await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  await prisma.cart.delete({ where: { id: cartId } }).catch(() => {});
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
});

describe("confirmCodOrder", () => {
  it("marks the order PAID, decrements stock, clears the cart, and creates no Payment row", async () => {
    await createOrder("COD");
    await confirmCodOrder(orderId);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID");
    expect(order.paidAt).not.toBeNull();
    expect(order.codCollectedAt).toBeNull(); // confirmed, not yet collected

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY);

    const cartItems = await prisma.cartItem.findMany({ where: { cartId } });
    expect(cartItems).toHaveLength(0);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(0); // no gateway payment for COD
  });

  it("is idempotent: calling it twice only decrements stock once", async () => {
    await createOrder("COD");
    await confirmCodOrder(orderId);
    await confirmCodOrder(orderId);

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(STARTING_STOCK - QUANTITY);
  });

  it("is a no-op for a RAZORPAY order (wrong payment method)", async () => {
    await createOrder("RAZORPAY");
    await confirmCodOrder(orderId);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PENDING"); // untouched — confirmCodOrder refused to claim it

    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(STARTING_STOCK); // untouched
  });

  it("flags needsReview instead of throwing when stock can't cover the order", async () => {
    await createOrder("COD");
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 1 } });

    await confirmCodOrder(orderId);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID"); // the COD order is still confirmed
    expect(order.needsReview).toBe(true);
  });
});

describe("markCodCollected", () => {
  it("records the collection time for a confirmed COD order", async () => {
    await createOrder("COD", "PAID");
    await markCodCollected(orderId);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.codCollectedAt).not.toBeNull();
  });

  it("rejects a RAZORPAY order", async () => {
    await createOrder("RAZORPAY", "PAID");
    await expect(markCodCollected(orderId)).rejects.toThrow(OrderActionError);
  });

  it("rejects collecting twice", async () => {
    await createOrder("COD", "PAID");
    await markCodCollected(orderId);
    await expect(markCodCollected(orderId)).rejects.toThrow(OrderActionError);
  });
});
