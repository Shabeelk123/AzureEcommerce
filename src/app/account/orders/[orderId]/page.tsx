import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrderForCustomer } from "@/lib/order";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Order details" };

type Props = { params: Promise<{ orderId: string }> };

async function OrderDetail({ params }: Props) {
  const [{ orderId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect("/login");

  const order = await getOrderForCustomer(orderId, user.id);
  if (!order) notFound();

  const address = order.shippingAddress as {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed{" "}
            {order.placedAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="rounded-lg border p-5">
        <OrderTimeline status={order.status} />
      </div>

      {order.status === "SHIPPED" && order.trackingNumber && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Tracking</p>
          <p className="text-muted-foreground">
            {order.carrier} — {order.trackingNumber}
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-lg border p-5">
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.productTitle} — {item.variantLabel} × {item.quantity}
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
              <span className="text-muted-foreground">Discount</span>
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
        <div className="border-t pt-3 text-sm">
          <p className="font-medium">Shipping to</p>
          <p className="text-muted-foreground">
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.city}, {address.state} {address.pincode}
          </p>
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

export default function OrderDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}
