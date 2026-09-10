import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getDashboardStats, type DashboardRange } from "@/lib/admin/dashboard";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Admin dashboard" };

type Props = { searchParams: Promise<{ range?: string }> };

const RANGES: DashboardRange[] = ["7d", "30d", "90d"];

async function DashboardStats({ searchParams }: Props) {
  const admin = await requireAdmin();
  const { range: rangeParam } = await searchParams;
  const range = RANGES.includes(rangeParam as DashboardRange) ? (rangeParam as DashboardRange) : "30d";

  const stats = await getDashboardStats(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500">Signed in as {admin.email}</p>
        </div>
        <div className="flex gap-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?range=${r}`}
              className={r === range ? "font-semibold underline" : "text-stone-500 hover:underline"}
            >
              {r}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Revenue ({range})</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{formatINR(stats.revenuePaise)}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Orders ({range})</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{stats.orderCount}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Average order value</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {formatINR(stats.averageOrderValuePaise)}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Products</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{stats.productCount}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Customers</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{stats.customerCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Recent orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {stats.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span>{formatINR(order.totalPaise)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Low stock</h2>
          {stats.lowStockVariants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is low on stock.</p>
          ) : (
            <ul className="divide-y text-sm">
              {stats.lowStockVariants.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/products?q=${variant.product.slug}`} className="hover:underline">
                    {variant.product.title} — {variant.colorName}
                  </Link>
                  <span className="text-amber-700">{variant.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardStats searchParams={searchParams} />
    </Suspense>
  );
}
