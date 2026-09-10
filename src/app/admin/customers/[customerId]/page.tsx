import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getCustomerForAdmin } from "@/lib/admin/customer";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatINR } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Customer details" };

type Props = { params: Promise<{ customerId: string }> };

async function CustomerDetail({ params }: Props) {
  await requireAdmin();
  const { customerId } = await params;
  const customer = await getCustomerForAdmin(customerId);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{customer.name ?? customer.email}</h1>
        <p className="text-sm text-muted-foreground">{customer.email}</p>
        {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
        <p className="mt-1 text-xs text-stone-500">
          Joined {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(customer.createdAt)} ·{" "}
          {customer.emailVerifiedAt ? "Email verified" : "Email not verified"}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent orders</h2>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {customer.orders.map((order) => (
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
        <h2 className="mb-3 text-sm font-semibold">Addresses</h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved addresses.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {customer.addresses.map((address) => (
              <li key={address.id} className="text-muted-foreground">
                {address.fullName} — {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state}{" "}
                {address.pincode}
                {address.isDefault && <span className="ml-2 text-xs text-stone-900">(default)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminCustomerDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}
