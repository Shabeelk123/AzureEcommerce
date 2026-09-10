import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrdersForUser } from "@/lib/order";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Your orders" };

async function OrdersList() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = await getOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t placed any orders yet.{" "}
        <Link href="/shop" className="text-primary hover:underline">
          Start shopping
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {order.placedAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {order.items.length} item{order.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{formatINR(order.totalPaise)}</span>
              <OrderStatusBadge status={order.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Your orders</h1>
      <Suspense fallback={<OrdersListSkeleton />}>
        <OrdersList />
      </Suspense>
    </div>
  );
}
