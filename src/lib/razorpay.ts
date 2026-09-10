import "server-only";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Constant-time HMAC-SHA256 comparison. The Razorpay SDK's own
 * `validateWebhookSignature` does the same HMAC but compares with plain
 * `===`, which short-circuits on the first differing byte — a
 * (admittedly hard-to-exploit-over-HTTPS, but free to close) timing
 * side-channel on a MAC comparison. `timingSafeEqual` is the standard
 * defense; we compute our own HMAC and use it for both the webhook and
 * the browser-callback verification below instead of the SDK helpers.
 */
function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

/** Verifies the `x-razorpay-signature` header on an incoming webhook request. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return verifyHmac(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
}

/**
 * Verifies the browser-callback payload Razorpay Checkout's `handler`
 * receives after a successful payment. Per Razorpay's documented scheme,
 * the signed payload is `order_id + "|" + payment_id`, signed with the
 * *key secret* (not the webhook secret — a different credential).
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  return verifyHmac(payload, params.razorpaySignature, env.RAZORPAY_KEY_SECRET);
}

/**
 * Fetches a payment's authoritative details straight from Razorpay's API.
 * Used by the browser-callback path: the callback only proves (via the
 * signature) that the browser was handed real ids by Razorpay — it never
 * tells us the amount or capture status. We never trust those from the
 * client; we ask Razorpay directly before fulfilling anything. (The
 * webhook path doesn't need this — its payload *is* the authoritative
 * server-to-server message, already signature-verified.)
 */
export async function fetchRazorpayPayment(paymentId: string) {
  return razorpay.payments.fetch(paymentId);
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  return razorpay.orders.create({
    amount: params.amountPaise,
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes,
  });
}

/**
 * Initiates a refund against a captured payment. `amountPaise` omitted
 * means a full refund. This only *starts* the refund — Razorpay's
 * response status is 'pending' until it actually settles, confirmed
 * asynchronously by the `refund.processed` webhook (see
 * src/app/api/webhooks/razorpay/route.ts), which is what actually flips
 * our Payment/Order status. Never trust this call's return value alone
 * for "the refund happened".
 */
export async function createRazorpayRefund(params: {
  razorpayPaymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
}) {
  return razorpay.payments.refund(params.razorpayPaymentId, {
    amount: params.amountPaise,
    notes: params.notes,
  });
}
