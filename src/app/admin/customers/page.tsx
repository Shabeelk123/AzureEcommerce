import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { listCustomersForAdmin } from "@/lib/admin/customer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Customers" };

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

async function CustomerList({ searchParams }: Props) {
  await requireAdmin();
  const { q, page } = await searchParams;
  const { customers, total, pageCount, page: currentPage } = await listCustomersForAdmin({
    search: q,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Customers ({total})</h1>
      </div>
      <form className="flex gap-2">
        <Input name="q" placeholder="Search by name or email" defaultValue={q} className="max-w-sm" />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Orders</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-stone-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">
                    {customer.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2 text-stone-500">{customer.email}</td>
                <td className="px-4 py-2">{customer.phone ?? "—"}</td>
                <td className="px-4 py-2">{customer._count.orders}</td>
                <td className="px-4 py-2 text-stone-500">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(customer.createdAt)}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex gap-2 text-sm">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
              className={p === currentPage ? "font-semibold underline" : "text-stone-500 hover:underline"}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CustomerList searchParams={searchParams} />
    </Suspense>
  );
}
