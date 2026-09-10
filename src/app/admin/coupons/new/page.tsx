import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { CouponForm } from "@/components/admin/coupon-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "New coupon" };

async function NewCouponContent() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">New coupon</h1>
      <CouponForm />
    </div>
  );
}

export default function NewCouponPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <NewCouponContent />
    </Suspense>
  );
}
