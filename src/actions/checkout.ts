"use server";

import { z } from "zod";
import { actionClient, ActionError } from "@/lib/safe-action";
import { checkRateLimit, checkoutLimiter } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { getCurrentUser } from "@/lib/auth/current-user";
import { placeOrder, fulfilOrder } from "@/lib/order";
import { fetchRazorpayPayment, verifyPaymentSignature } from "@/lib/razorpay";
import { validateCoupon } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { placeOrderSchema, verifyPaymentSchema } from "@/lib/validators/checkout";

export const placeOrderAction = actionClient
  .inputSchema(placeOrderSchema)
  .action(async ({ parsedInput }) => {
    const ip = await requestIp();
    const { allowed } = await checkRateLimit(checkoutLimiter, ip);
    if (!allowed) {
      throw new ActionError(
        "Too many checkout attempts. Please try again in a few minutes.",
      );
    }

    const user = await getCurrentUser();
    const result = await placeOrder({
      userId: user?.id ?? null,
      email: parsedInput.email,
      fullName: parsedInput.fullName,
      phone: parsedInput.phone,
      line1: parsedInput.line1,
      line2: parsedInput.line2 || undefined,
      city: parsedInput.city,
      state: parsedInput.state,
      pincode: parsedInput.pincode,
      couponCode: parsedInput.couponCode || undefined,
    });

    if (!result.ok) throw new ActionError(result.reason);
    return result;
  });

/**
 * Runs after Razorpay Checkout's `handler` fires in the browser. This is
 * the fast-path UX confirmation, NOT the source of truth for payment —
 * see fulfilOrder's docstring, and the webhook route, which will fulfil
 * the same order independently (and idempotently) if this call is slow,
 * dropped, or never happens because the user closed the tab.
 *
 * The amount/method used to fulfil come from an independent fetch to
 * Razorpay's API, never from anything the browser supplied beyond the
 * signed ids — Checkout's `handler` payload doesn't even include an
 * amount, so there's nothing to accidentally trust here.
 */
export const verifyPaymentAction = actionClient
  .inputSchema(verifyPaymentSchema)
  .action(async ({ parsedInput }) => {
    const validSignature = verifyPaymentSignature(parsedInput);
    if (!validSignature) {
      throw new ActionError("Payment verification failed.");
    }

    const payment = await fetchRazorpayPayment(parsedInput.razorpayPaymentId);
    if (payment.order_id !== parsedInput.razorpayOrderId) {
      throw new ActionError("Payment verification failed.");
    }
    if (payment.status !== "captured" && payment.status !== "authorized") {
      throw new ActionError("This payment was not completed.");
    }

    await fulfilOrder({
      razorpayOrderId: parsedInput.razorpayOrderId,
      razorpayPaymentId: parsedInput.razorpayPaymentId,
      method: payment.method ?? null,
      amountPaise: Number(payment.amount),
      rawPayload: payment,
    });

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: parsedInput.razorpayOrderId },
      select: { id: true },
    });
    return { orderId: order?.id };
  });

export const applyCouponAction = actionClient
  .inputSchema(
    z.object({ code: z.string().trim().min(1), subtotalPaise: z.number().int().min(0) }),
  )
  .action(async ({ parsedInput }) => {
    const result = await validateCoupon(parsedInput.code, parsedInput.subtotalPaise);
    if (!result.ok) throw new ActionError(result.reason);
    return { discountPaise: result.discountPaise, code: result.coupon.code };
  });
