import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";
import { env } from "@/env";

describe("verifyPaymentSignature", () => {
  it("accepts a correctly signed order_id|payment_id payload", () => {
    const razorpayOrderId = "order_abc123";
    const razorpayPaymentId = "pay_xyz789";
    const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    expect(
      verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature,
      }),
    ).toBe(true);
  });

  it("rejects a tampered payment id", () => {
    const razorpayOrderId = "order_abc123";
    const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|pay_xyz789`)
      .digest("hex");

    expect(
      verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId: "pay_attacker_swapped",
        razorpaySignature: signature,
      }),
    ).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const razorpayOrderId = "order_abc123";
    const razorpayPaymentId = "pay_xyz789";
    const signature = createHmac("sha256", "not-the-real-secret")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    expect(
      verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature,
      }),
    ).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: "x",
        razorpayPaymentId: "y",
        razorpaySignature: "not-hex-at-all!!",
      }),
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed raw body", () => {
    const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });
    const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a body that doesn't match the signature (payload tampered after signing)", () => {
    const originalBody = JSON.stringify({
      event: "payment.captured",
      payload: { amount: 100 },
    });
    const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(originalBody)
      .digest("hex");

    const tamperedBody = JSON.stringify({
      event: "payment.captured",
      payload: { amount: 999999 },
    });
    expect(verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });
});
