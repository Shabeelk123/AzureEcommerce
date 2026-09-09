import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupon";

const createdCodes: string[] = [];

afterEach(async () => {
  await prisma.coupon.deleteMany({ where: { code: { in: createdCodes } } });
  createdCodes.length = 0;
});

function code(suffix: string) {
  const c = `TEST${suffix}${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  createdCodes.push(c);
  return c;
}

describe("validateCoupon", () => {
  it("rejects an unknown code", async () => {
    const result = await validateCoupon("DOES-NOT-EXIST", 100000);
    expect(result.ok).toBe(false);
  });

  it("applies a percent discount", async () => {
    const c = code("PCT");
    await prisma.coupon.create({ data: { code: c, type: "PERCENT", value: 10 } });

    const result = await validateCoupon(c, 100000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discountPaise).toBe(10000);
  });

  it("applies a fixed discount, capped at the subtotal", async () => {
    const c = code("FIX");
    await prisma.coupon.create({ data: { code: c, type: "FIXED", value: 50000 } });

    const small = await validateCoupon(c, 30000);
    expect(small.ok).toBe(true);
    if (small.ok) expect(small.discountPaise).toBe(30000); // capped, never negative total

    const large = await validateCoupon(c, 100000);
    expect(large.ok).toBe(true);
    if (large.ok) expect(large.discountPaise).toBe(50000);
  });

  it("rejects an inactive coupon", async () => {
    const c = code("INACTIVE");
    await prisma.coupon.create({
      data: { code: c, type: "PERCENT", value: 10, isActive: false },
    });
    expect((await validateCoupon(c, 100000)).ok).toBe(false);
  });

  it("rejects a coupon that hasn't started yet", async () => {
    const c = code("FUTURE");
    await prisma.coupon.create({
      data: {
        code: c,
        type: "PERCENT",
        value: 10,
        startsAt: new Date(Date.now() + 86400000),
      },
    });
    expect((await validateCoupon(c, 100000)).ok).toBe(false);
  });

  it("rejects an expired coupon", async () => {
    const c = code("EXPIRED");
    await prisma.coupon.create({
      data: {
        code: c,
        type: "PERCENT",
        value: 10,
        endsAt: new Date(Date.now() - 86400000),
      },
    });
    expect((await validateCoupon(c, 100000)).ok).toBe(false);
  });

  it("rejects a coupon that's reached its redemption limit", async () => {
    const c = code("MAXED");
    await prisma.coupon.create({
      data: {
        code: c,
        type: "PERCENT",
        value: 10,
        maxRedemptions: 3,
        redemptionCount: 3,
      },
    });
    expect((await validateCoupon(c, 100000)).ok).toBe(false);
  });

  it("rejects a subtotal below the coupon's minimum", async () => {
    const c = code("MINSUB");
    await prisma.coupon.create({
      data: { code: c, type: "PERCENT", value: 10, minSubtotalPaise: 100000 },
    });
    expect((await validateCoupon(c, 50000)).ok).toBe(false);
    expect((await validateCoupon(c, 100000)).ok).toBe(true);
  });

  it("is case-insensitive on the code", async () => {
    const c = code("CASE"); // code() already returns an uppercase code — tracked for cleanup as-is
    await prisma.coupon.create({ data: { code: c, type: "PERCENT", value: 10 } });
    expect((await validateCoupon(c.toLowerCase(), 100000)).ok).toBe(true);
  });
});
