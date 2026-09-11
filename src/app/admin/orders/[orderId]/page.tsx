import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOrderForAdmin } from "@/lib/order";
import { requireAdmin } from "@/lib/auth/current-user";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { AdminOrderActions } from "@/components/orders/admin-order-actions";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Order details" };

type Props = { params: Promise<{ orderId: string }> };

async function OrderDetail({ params }: Props) {
  await requireAdmin();
  const { orderId } = await params;
  const order = await getOrderForAdmin(orderId);
  if (!order) notFound();

  const address = order.shippingAddress as {
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };

  const capturedPayment = order.payments.find((p) => p.status === "CAPTURED");
  const alreadyRefundedPaise = capturedPayment
    ? capturedPayment.refunds
        .filter((r) => r.status !== "FAILED")
        .reduce((sum, r) => sum + r.amountPaise, 0)
    : 0;
  const refundableAmountPaise = capturedPayment
    ? capturedPayment.amountPaise - alreadyRefundedPaise
    : 0;
  const canRefund = Boolean(capturedPayment) && refundableAmountPaise > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{order.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.paymentMethod === "COD" && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
              COD
            </span>
          )}
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {order.needsReview && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Payment was captured but at least one item couldn&apos;t be fully reserved from
          stock at fulfillment time — review before shipping.
        </div>
      )}

      <div className="rounded-lg border p-5">
        <OrderTimeline status={order.status} />
      </div>

      <AdminOrderActions
        orderId={order.id}
        status={order.status}
        paymentMethod={order.paymentMethod}
        codCollectedAt={order.codCollectedAt}
        canRefund={canRefund}
        refundableAmountPaise={refundableAmountPaise}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold">Items</h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2 text-sm">
                <span>
                  {item.productTitle} — {item.variantLabel} × {item.quantity}
                  <span className="block text-xs text-muted-foreground">{item.sku}</span>
                </span>
                <span>{formatINR(item.unitPricePaise * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(order.subtotalPaise)}</span>
            </div>
            {order.discountPaise > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount {order.couponCode ? `(${order.couponCode})` : ""}
                </span>
                <span>-{formatINR(order.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatINR(order.totalPaise)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 text-sm">
            <h2 className="mb-2 text-sm font-semibold">Shipping address</h2>
            <p className="text-muted-foreground">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.phone}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 text-sm">
            <h2 className="mb-2 text-sm font-semibold">Payments</h2>
            {order.paymentMethod === "COD" ? (
              <div className="flex items-center justify-between">
                <span>Cash on Delivery</span>
                {order.codCollectedAt ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                    Collected {formatINR(order.totalPaise)}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    Not yet collected
                  </span>
                )}
              </div>
            ) : order.payments.length === 0 ? (
              <p className="text-muted-foreground">No payment recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {order.payments.map((payment) => (
                  <li key={payment.id}>
                    <div className="flex justify-between">
                      <span>
                        {payment.razorpayPaymentId} ({payment.method ?? "unknown"})
                      </span>
                      <span>{formatINR(payment.amountPaise)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{payment.status}</span>
                    {payment.refunds.map((refund) => (
                      <div
                        key={refund.id}
                        className="mt-1 flex justify-between pl-3 text-xs text-muted-foreground"
                      >
                        <span>Refund ({refund.status})</span>
                        <span>{formatINR(refund.amountPaise)}</span>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminOrderDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}
