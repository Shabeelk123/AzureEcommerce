import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// Real Postgres for the actual business logic (status transitions, refund
// bookkeeping) — same rationale as fulfil-order.test.ts. The external
// boundaries (Razorpay's API, Resend) are mocked: this suite is testing
// our own transition/validation rules, not a third-party's network layer.
vi.mock("@/lib/razorpay", () => ({
  createRazorpayRefund: vi.fn().mockResolvedValue({ id: "rfnd_test", status: "pending" }),
}));
vi.mock("@/lib/email", () => ({
  sendOrderShippedEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendRefundInitiatedEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

const { createRazorpayRefund } = await import("@/lib/razorpay");
const {
  OrderActionError,
  cancelOrder,
  issueRefund,
  markOrderShipped,
  updateOrderStatus,
} = await import("@/lib/order");

let orderId: string;

async function createTestOrder(status: "PENDING" | "PAID" | "PACKED" | "SHIPPED" | "DELIVERED") {
  const suffix = crypto.randomUUID();
  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-${suffix}`,
      email: "shopper@example.com",
      phone: "9876543210",
      status,
      subtotalPaise: 79900,
      totalPaise: 79900,
      shippingAddress: { fullName: "Test", line1: "1 Test St", city: "X", state: "Y", pincode: "123456" },
      billingAddress: { fullName: "Test", line1: "1 Test St", city: "X", state: "Y", pincode: "123456" },
      items: {
        create: [
          {
            productTitle: "Test Hijab",
            variantLabel: "Black",
            sku: `SKU-${suffix}`,
            unitPricePaise: 79900,
            quantity: 1,
          },
        ],
      },
    },
  });
  return order.id;
}

async function addCapturedPayment(forOrderId: string, amountPaise = 79900) {
  return prisma.payment.create({
    data: {
      orderId: forOrderId,
      razorpayPaymentId: `pay_${crypto.randomUUID()}`,
      amountPaise,
      status: "CAPTURED",
      capturedAt: new Date(),
      rawPayload: {},
    },
  });
}

afterEach(async () => {
  vi.clearAllMocks();
  if (orderId) await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
});

describe("updateOrderStatus", () => {
  it("allows PAID -> PACKED", async () => {
    orderId = await createTestOrder("PAID");
    await updateOrderStatus(orderId, "PACKED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PACKED");
    expect(order.packedAt).not.toBeNull();
  });

  it("allows SHIPPED -> DELIVERED", async () => {
    orderId = await createTestOrder("SHIPPED");
    await updateOrderStatus(orderId, "DELIVERED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("DELIVERED");
    expect(order.deliveredAt).not.toBeNull();
  });

  it("rejects PENDING -> PACKED (never paid)", async () => {
    orderId = await createTestOrder("PENDING");
    await expect(updateOrderStatus(orderId, "PACKED")).rejects.toThrow(OrderActionError);
  });

  it("rejects PAID -> DELIVERED (skipping shipped)", async () => {
    orderId = await createTestOrder("PAID");
    await expect(updateOrderStatus(orderId, "DELIVERED")).rejects.toThrow(OrderActionError);
  });

  it("rejects DELIVERED -> PACKED (no going backwards)", async () => {
    orderId = await createTestOrder("DELIVERED");
    await expect(updateOrderStatus(orderId, "PACKED")).rejects.toThrow(OrderActionError);
  });
});

describe("markOrderShipped", () => {
  it("sets tracking info and moves PACKED -> SHIPPED", async () => {
    orderId = await createTestOrder("PACKED");
    await markOrderShipped(orderId, { trackingNumber: "TRK123", carrier: "Delhivery" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("SHIPPED");
    expect(order.trackingNumber).toBe("TRK123");
    expect(order.carrier).toBe("Delhivery");
    expect(order.shippedAt).not.toBeNull();
  });

  it("allows shipping directly from PAID (skipping packed)", async () => {
    orderId = await createTestOrder("PAID");
    await markOrderShipped(orderId, { trackingNumber: "TRK1", carrier: "BlueDart" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("SHIPPED");
  });

  it("rejects shipping an already-delivered order", async () => {
    orderId = await createTestOrder("DELIVERED");
    await expect(
      markOrderShipped(orderId, { trackingNumber: "X", carrier: "Y" }),
    ).rejects.toThrow(OrderActionError);
  });
});

describe("cancelOrder", () => {
  it("cancels a PENDING order with no payment (no refund call made)", async () => {
    orderId = await createTestOrder("PENDING");
    await cancelOrder(orderId, "Changed my mind");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("CANCELLED");
    expect(order.cancelledAt).not.toBeNull();
    expect(order.notes).toContain("Changed my mind");
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("cancels a PAID order and automatically triggers a full refund", async () => {
    orderId = await createTestOrder("PAID");
    await addCapturedPayment(orderId);
    await cancelOrder(orderId);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("CANCELLED");
    expect(createRazorpayRefund).toHaveBeenCalledTimes(1);
  });

  it("rejects cancelling a SHIPPED order (must use refund/return instead)", async () => {
    orderId = await createTestOrder("SHIPPED");
    await expect(cancelOrder(orderId)).rejects.toThrow(OrderActionError);
  });
});

describe("issueRefund", () => {
  it("rejects refunding an order with no captured payment", async () => {
    orderId = await createTestOrder("PAID");
    await expect(issueRefund(orderId)).rejects.toThrow(OrderActionError);
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("issues a full refund when no amount is specified", async () => {
    orderId = await createTestOrder("DELIVERED");
    await addCapturedPayment(orderId, 79900);
    await issueRefund(orderId);
    expect(createRazorpayRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: undefined }),
    );
  });

  it("rejects a partial refund amount greater than the captured payment", async () => {
    orderId = await createTestOrder("DELIVERED");
    await addCapturedPayment(orderId, 79900);
    await expect(issueRefund(orderId, { amountPaise: 100000 })).rejects.toThrow(
      OrderActionError,
    );
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it("allows a partial refund within the captured amount", async () => {
    orderId = await createTestOrder("DELIVERED");
    await addCapturedPayment(orderId, 79900);
    await issueRefund(orderId, { amountPaise: 30000 });
    expect(createRazorpayRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 30000 }),
    );
  });
});
