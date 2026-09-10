import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { env } from "@/env";
import { VerifyEmail } from "@/emails/verify-email";
import { ResetPasswordEmail } from "@/emails/reset-password";
import {
  OrderConfirmationEmail,
  type OrderConfirmationItem,
} from "@/emails/order-confirmation";
import { OrderShippedEmail } from "@/emails/order-shipped";
import { OrderCancelledEmail } from "@/emails/order-cancelled";
import { RefundInitiatedEmail } from "@/emails/refund-initiated";

const resend = new Resend(env.RESEND_API_KEY);
const SEND_TIMEOUT_MS = 5000;

// Neither signup nor password-reset should be able to hang on Resend being
// slow or unreachable — every caller already treats a thrown error here as
// non-fatal (signup logs and continues; the reset flow always returns the
// same generic message regardless). A timeout just bounds how long that
// takes to give up.
async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), SEND_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const html = await render(VerifyEmail({ verifyUrl }));
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Verify your email — AzureHijabs",
      html,
    }),
    "sendVerificationEmail",
  );
  if (error) {
    console.error("[email] failed to send verification email", error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = await render(ResetPasswordEmail({ resetUrl }));
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Reset your password — AzureHijabs",
      html,
    }),
    "sendPasswordResetEmail",
  );
  if (error) {
    console.error("[email] failed to send password reset email", error);
    throw new Error("Failed to send password reset email");
  }
}

type ShippingAddress = {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
};

export async function sendOrderConfirmationEmail(order: {
  email: string;
  orderNumber: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  shippingAddress: unknown;
  items: OrderConfirmationItem[];
}) {
  const html = await render(
    OrderConfirmationEmail({
      orderNumber: order.orderNumber,
      items: order.items,
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      shippingPaise: order.shippingPaise,
      totalPaise: order.totalPaise,
      shippingAddress: order.shippingAddress as ShippingAddress,
    }),
  );
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to: order.email,
      subject: `Order confirmed — ${order.orderNumber}`,
      html,
    }),
    "sendOrderConfirmationEmail",
  );
  if (error) {
    console.error("[email] failed to send order confirmation email", error);
    throw new Error("Failed to send order confirmation email");
  }
}

export async function sendOrderShippedEmail(params: {
  email: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
}) {
  const html = await render(
    OrderShippedEmail({
      orderNumber: params.orderNumber,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
    }),
  );
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.email,
      subject: `Your order has shipped — ${params.orderNumber}`,
      html,
    }),
    "sendOrderShippedEmail",
  );
  if (error) {
    console.error("[email] failed to send shipped email", error);
    throw new Error("Failed to send shipped email");
  }
}

export async function sendOrderCancelledEmail(params: { email: string; orderNumber: string }) {
  const html = await render(OrderCancelledEmail({ orderNumber: params.orderNumber }));
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.email,
      subject: `Order cancelled — ${params.orderNumber}`,
      html,
    }),
    "sendOrderCancelledEmail",
  );
  if (error) {
    console.error("[email] failed to send cancellation email", error);
    throw new Error("Failed to send cancellation email");
  }
}

export async function sendRefundInitiatedEmail(params: {
  email: string;
  orderNumber: string;
  amountPaise: number;
}) {
  const html = await render(
    RefundInitiatedEmail({ orderNumber: params.orderNumber, amountPaise: params.amountPaise }),
  );
  const { error } = await withTimeout(
    resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.email,
      subject: `Refund initiated — ${params.orderNumber}`,
      html,
    }),
    "sendRefundInitiatedEmail",
  );
  if (error) {
    console.error("[email] failed to send refund-initiated email", error);
    throw new Error("Failed to send refund-initiated email");
  }
}
