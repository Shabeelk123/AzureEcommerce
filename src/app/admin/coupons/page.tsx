import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { listCouponsForAdmin } from "@/lib/admin/coupon";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Coupons" };

async function CouponList() {
  await requireAdmin();
  const coupons = await listCouponsForAdmin();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Coupons</h1>
        <Button asChild size="sm">
          <Link href="/admin/coupons/new">New coupon</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Redemptions</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-stone-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/coupons/${coupon.id}`} className="font-medium hover:underline">
                    {coupon.code}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {coupon.type === "PERCENT" ? `${coupon.value}%` : formatINR(coupon.value)}
                </td>
                <td className="px-4 py-2">
                  {coupon.redemptionCount}
                  {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ""}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      coupon.isActive
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                        : "rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                    }
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CouponList />
    </Suspense>
  );
}
