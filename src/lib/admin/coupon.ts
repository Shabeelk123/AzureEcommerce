import "server-only";
import { prisma } from "@/lib/prisma";
import type { CouponType } from "@/generated/prisma/client";

export class CouponActionError extends Error {}

export async function listCouponsForAdmin() {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getCouponForAdmin(id: string) {
  return prisma.coupon.findUnique({ where: { id } });
}

export type CouponInput = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalPaise: number;
  maxRedemptions?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function assertValid(input: CouponInput) {
  if (input.type === "PERCENT" && (input.value < 1 || input.value > 100)) {
    throw new CouponActionError("Percent coupons must have a value between 1 and 100.");
  }
  if (input.type === "FIXED" && input.value < 1) {
    throw new CouponActionError("Fixed coupons must have a positive paise value.");
  }
  if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
    throw new CouponActionError("Start date must be before the end date.");
  }
}

export async function createCoupon(input: CouponInput) {
  assertValid(input);
  const code = normalizeCode(input.code);
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new CouponActionError(`Coupon code "${code}" already exists.`);

  return prisma.coupon.create({ data: { ...input, code } });
}

export async function updateCoupon(id: string, input: CouponInput) {
  assertValid(input);
  const code = normalizeCode(input.code);
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing && existing.id !== id) {
    throw new CouponActionError(`Coupon code "${code}" already exists.`);
  }

  return prisma.coupon.update({ where: { id }, data: { ...input, code } }).catch(() => {
    throw new CouponActionError("Coupon not found.");
  });
}

export async function deleteCoupon(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new CouponActionError("Coupon not found.");

  // Orders reference Coupon by `code` (a restrict-on-delete FK, per schema),
  // so a coupon that has ever been redeemed can't be hard-deleted without
  // orphaning order history — deactivate it instead.
  const usedCount = await prisma.order.count({ where: { couponCode: coupon.code } });
  if (usedCount > 0) {
    throw new CouponActionError(
      "This coupon has been used on at least one order and can't be deleted — deactivate it instead.",
    );
  }
  return prisma.coupon.delete({ where: { id } });
}
