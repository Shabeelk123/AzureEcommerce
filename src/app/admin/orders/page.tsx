import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getOrdersForAdmin, type AdminOrderFilters } from "@/lib/order";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Orders" };

type RawParams = { status?: string; q?: string; page?: string };
type Props = { searchParams: Promise<RawParams> };

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

function buildHref(base: RawParams, overrides: Partial<RawParams>): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.q) params.set("q", merged.q);
  if (overrides.page) params.set("page", overrides.page);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

async function OrdersTable({ searchParams }: Props) {
  await requireAdmin();
  const raw = await searchParams;
  const filters: AdminOrderFilters = {
    status: raw.status && STATUS_OPTIONS.includes(raw.status as OrderStatus) ? (raw.status as OrderStatus) : undefined,
    search: raw.q,
    page: Number(raw.page) || 1,
  };

  const { orders, total, page, pageCount } = await getOrdersForAdmin(filters);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <form action="/admin/orders" className="flex gap-2">
          {raw.status && <input type="hidden" name="status" value={raw.status} />}
          <Input name="q" defaultValue={raw.q} placeholder="Search order # or email…" className="w-64" />
        </form>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={buildHref(raw, { status: undefined })}
            className={!raw.status ? "font-medium text-primary" : "text-muted-foreground"}
          >
            All
          </Link>
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={buildHref(raw, { status: s })}
              className={raw.status === s ? "font-medium text-primary" : "text-muted-foreground"}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <p className="mb-2 text-sm text-muted-foreground">{total} orders</p>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-stone-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                  {order.needsReview && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Needs review
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.placedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{order.email}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right">{formatINR(order.totalPaise)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref(raw, { page: String(p) })}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function OrdersTableSkeleton() {
  return <Skeleton className="h-96 w-full" />;
}

export default function AdminOrdersPage({ searchParams }: Props) {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Orders</h1>
      <Suspense fallback={<OrdersTableSkeleton />}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
