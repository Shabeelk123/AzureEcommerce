import "server-only";
import { prisma } from "@/lib/prisma";
import { applyPercentDiscount } from "@/lib/money";
import type { Coupon } from "@/generated/prisma/client";

export type CouponValidation =
  { ok: true; coupon: Coupon; discountPaise: number } | { ok: false; reason: string };

/**
 * Deliberately NOT cached — a coupon's redemption count changes on every
 * use, and reusing a stale "still has redemptions left" read would let a
 * coupon be over-redeemed right at its limit.
 */
export async function validateCoupon(
  code: string,
  subtotalPaise: number,
): Promise<CouponValidation> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    return { ok: false, reason: "This coupon code isn't valid." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, reason: "This coupon isn't active yet." };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { ok: false, reason: "This coupon has expired." };
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "This coupon has reached its redemption limit." };
  }
  if (subtotalPaise < coupon.minSubtotalPaise) {
    return {
      ok: false,
      reason: `This coupon requires a minimum order of ${(coupon.minSubtotalPaise / 100).toFixed(2)}.`,
    };
  }

  const discountPaise =
    coupon.type === "PERCENT"
      ? applyPercentDiscount(subtotalPaise, coupon.value)
      : Math.min(coupon.value, subtotalPaise); // never discount past zero

  return { ok: true, coupon, discountPaise };
}
