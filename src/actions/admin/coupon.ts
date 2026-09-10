"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import { CouponActionError, createCoupon, deleteCoupon, updateCoupon } from "@/lib/admin/coupon";

const couponInputSchema = z.object({
  code: z.string().trim().min(3).max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  minSubtotalPaise: z.number().int().min(0).default(0),
  maxRedemptions: z.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const createCouponAction = actionClient
  .inputSchema(couponInputSchema)
  .action(async ({ parsedInput }) => {
    const coupon = await runAdminOp({
      action: "coupon.create",
      entity: "Coupon",
      errorClass: CouponActionError,
      op: () =>
        createCoupon({
          ...parsedInput,
          maxRedemptions: parsedInput.maxRedemptions ?? null,
          startsAt: parsedInput.startsAt ?? null,
          endsAt: parsedInput.endsAt ?? null,
        }),
      entityId: (c) => c.id,
      diff: () => parsedInput,
    });
    return { ok: true, id: coupon.id };
  });

export const updateCouponAction = actionClient
  .inputSchema(couponInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id, ...input } }) => {
    await runAdminOp({
      action: "coupon.update",
      entity: "Coupon",
      errorClass: CouponActionError,
      op: () =>
        updateCoupon(id, {
          ...input,
          maxRedemptions: input.maxRedemptions ?? null,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
        }),
      entityId: () => id,
      diff: () => input,
    });
    return { ok: true };
  });

export const deleteCouponAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "coupon.delete",
      entity: "Coupon",
      errorClass: CouponActionError,
      op: () => deleteCoupon(parsedInput.id),
      entityId: () => parsedInput.id,
    });
    return { ok: true };
  });
