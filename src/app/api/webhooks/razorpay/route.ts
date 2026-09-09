import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfilOrder } from "@/lib/order";
import { prisma } from "@/lib/prisma";

type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  method: string | null;
  status: string;
};

type RazorpayRefundEntity = {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
};

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
};

async function handlePaymentCaptured(entity: RazorpayPaymentEntity) {
  await fulfilOrder({
    razorpayOrderId: entity.order_id,
    razorpayPaymentId: entity.id,
    method: entity.method,
    amountPaise: entity.amount,
    rawPayload: entity,
  });
}

async function handlePaymentFailed(entity: RazorpayPaymentEntity) {
  const order = await prisma.order.findUnique({
    where: { razorpayOrderId: entity.order_id },
  });
  if (!order) return;
  // Record the attempt for the audit trail. The order itself stays
  // PENDING — Razorpay allows further payment attempts against the same
  // order, and the shopper may simply retry with a different method.
  await prisma.payment.upsert({
    where: { razorpayPaymentId: entity.id },
    update: {},
    create: {
      orderId: order.id,
      razorpayPaymentId: entity.id,
      method: entity.method,
      amountPaise: entity.amount,
      status: "FAILED",
      rawPayload: entity,
    },
  });
}

async function handleRefundProcessed(entity: RazorpayRefundEntity) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: entity.payment_id },
  });
  if (!payment) return;

  await prisma.refund.upsert({
    where: { razorpayRefundId: entity.id },
    update: { status: "PROCESSED" },
    create: {
      paymentId: payment.id,
      razorpayRefundId: entity.id,
      amountPaise: entity.amount,
      status: "PROCESSED",
    },
  });

  const fullyRefunded = entity.amount >= payment.amountPaise;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
  });
  if (fullyRefunded) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "REFUNDED" },
    });
  }
}

export async function POST(request: Request) {
  // Read the raw body — signature verification is over the exact bytes
  // Razorpay sent. Parsing to JSON first (and re-serializing to verify)
  // would risk key-order/whitespace differences invalidating a legitimate
  // signature.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    console.warn("[webhook:razorpay] invalid or missing signature");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Idempotency ledger: insert-first, then process. A unique-constraint
  // violation here means this exact delivery was already handled — return
  // 200 immediately rather than reprocessing (Razorpay retries webhooks
  // that don't get a timely 2xx, so redelivery is the expected, normal
  // case to guard against, not a rare edge case).
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${body.event}:${rawBody.length}:${Date.now()}`;
  try {
    await prisma.webhookEvent.create({
      data: { provider: "razorpay", eventId, type: body.event, payload: body },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return Response.json({ status: "already processed" });
    }
    throw error;
  }

  try {
    switch (body.event) {
      case "payment.captured": {
        if (body.payload.payment)
          await handlePaymentCaptured(body.payload.payment.entity);
        break;
      }
      case "payment.failed": {
        if (body.payload.payment) await handlePaymentFailed(body.payload.payment.entity);
        break;
      }
      case "refund.processed": {
        if (body.payload.refund) await handleRefundProcessed(body.payload.refund.entity);
        break;
      }
      default:
        // Unhandled event types are fine to no-op — the ledger row above
        // already records that we saw it.
        break;
    }
  } catch (error) {
    console.error(`[webhook:razorpay] failed to process ${body.event}`, error);
    // Still 200: the event is recorded in WebhookEvent, and returning a
    // non-2xx would make Razorpay retry a delivery whose *processing*
    // failed on our side, not its signature/format — a retry won't fix a
    // bug, it'll just hammer the same failure. Errors here need
    // alerting/log-monitoring, not Razorpay's retry loop.
  }

  await prisma.webhookEvent.updateMany({
    where: { eventId },
    data: { processedAt: new Date() },
  });

  return Response.json({ status: "ok" });
}
