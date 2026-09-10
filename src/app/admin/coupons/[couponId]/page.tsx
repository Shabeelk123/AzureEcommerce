import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getCouponForAdmin } from "@/lib/admin/coupon";
import { CouponForm } from "@/components/admin/coupon-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Edit coupon" };

type Props = { params: Promise<{ couponId: string }> };

async function EditCoupon({ params }: Props) {
  await requireAdmin();
  const { couponId } = await params;
  const coupon = await getCouponForAdmin(couponId);
  if (!coupon) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Edit coupon</h1>
      <CouponForm initial={coupon} />
    </div>
  );
}

export default function EditCouponPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <EditCoupon params={params} />
    </Suspense>
  );
}
