import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  CategoryActionError,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/admin/category";
import { CouponActionError, createCoupon, deleteCoupon } from "@/lib/admin/coupon";
import { ProductActionError, createProduct, createVariant } from "@/lib/admin/product";
import { InventoryActionError, bulkUpdateStock } from "@/lib/admin/inventory";

function unique(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const cleanupCategoryIds: string[] = [];
const cleanupCouponIds: string[] = [];
const cleanupProductIds: string[] = [];

afterEach(async () => {
  await prisma.product.deleteMany({ where: { id: { in: cleanupProductIds } } });
  cleanupProductIds.length = 0;
  await prisma.coupon.deleteMany({ where: { id: { in: cleanupCouponIds } } });
  cleanupCouponIds.length = 0;
  await prisma.category.deleteMany({ where: { id: { in: cleanupCategoryIds } } });
  cleanupCategoryIds.length = 0;
});

describe("category admin CRUD", () => {
  it("rejects a duplicate slug on create", async () => {
    const slug = unique("cat");
    const first = await createCategory({ slug, name: "First" });
    cleanupCategoryIds.push(first.id);

    await expect(createCategory({ slug, name: "Second" })).rejects.toThrow(CategoryActionError);
  });

  it("rejects updating to a slug already used by another category", async () => {
    const slugA = unique("cat-a");
    const slugB = unique("cat-b");
    const a = await createCategory({ slug: slugA, name: "A" });
    const b = await createCategory({ slug: slugB, name: "B" });
    cleanupCategoryIds.push(a.id, b.id);

    await expect(updateCategory(b.id, { slug: slugA, name: "B" })).rejects.toThrow(
      CategoryActionError,
    );
  });

  it("refuses to delete a category with products assigned", async () => {
    const slug = unique("cat");
    const category = await createCategory({ slug, name: "Has products" });
    cleanupCategoryIds.push(category.id);

    const product = await createProduct({
      slug: unique("prod"),
      title: "Test product",
      description: "desc",
      categoryId: category.id,
      collectionIds: [],
      status: "DRAFT",
      fabric: "Chiffon",
      basePricePaise: 10000,
    });
    cleanupProductIds.push(product.id);

    await expect(deleteCategory(category.id)).rejects.toThrow(CategoryActionError);
  });
});

describe("coupon admin CRUD", () => {
  it("rejects a PERCENT value outside 1-100", async () => {
    await expect(
      createCoupon({
        code: unique("PCT"),
        type: "PERCENT",
        value: 150,
        minSubtotalPaise: 0,
        isActive: true,
      }),
    ).rejects.toThrow(CouponActionError);
  });

  it("rejects a start date after the end date", async () => {
    await expect(
      createCoupon({
        code: unique("DATE"),
        type: "FIXED",
        value: 5000,
        minSubtotalPaise: 0,
        isActive: true,
        startsAt: new Date("2026-06-01"),
        endsAt: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(CouponActionError);
  });

  it("refuses to delete a coupon that has been redeemed on an order", async () => {
    const code = unique("USED");
    const coupon = await createCoupon({
      code,
      type: "FIXED",
      value: 5000,
      minSubtotalPaise: 0,
      isActive: true,
    });
    cleanupCouponIds.push(coupon.id);

    const order = await prisma.order.create({
      data: {
        orderNumber: unique("ORD"),
        email: "shopper@example.com",
        phone: "9876543210",
        status: "PAID",
        subtotalPaise: 79900,
        totalPaise: 74900,
        couponCode: coupon.code,
        shippingAddress: { fullName: "T", line1: "1", city: "X", state: "Y", pincode: "123456" },
        billingAddress: { fullName: "T", line1: "1", city: "X", state: "Y", pincode: "123456" },
      },
    });

    await expect(deleteCoupon(coupon.id)).rejects.toThrow(CouponActionError);

    await prisma.order.delete({ where: { id: order.id } });
  });

  it("deletes an unused coupon cleanly", async () => {
    const coupon = await createCoupon({
      code: unique("FREE"),
      type: "FIXED",
      value: 5000,
      minSubtotalPaise: 0,
      isActive: true,
    });
    await expect(deleteCoupon(coupon.id)).resolves.toBeDefined();
  });
});

describe("product/variant admin CRUD", () => {
  it("rejects a duplicate SKU across variants", async () => {
    const category = await createCategory({ slug: unique("cat"), name: "Cat" });
    cleanupCategoryIds.push(category.id);
    const product = await createProduct({
      slug: unique("prod"),
      title: "Product",
      description: "desc",
      categoryId: category.id,
      collectionIds: [],
      status: "DRAFT",
      fabric: "Chiffon",
      basePricePaise: 10000,
    });
    cleanupProductIds.push(product.id);

    const sku = unique("SKU");
    await createVariant(product.id, {
      sku,
      colorName: "Black",
      colorHex: "#000000",
      stock: 5,
      lowStockThreshold: 5,
      weightGrams: 100,
      isActive: true,
    });

    await expect(
      createVariant(product.id, {
        sku,
        colorName: "White",
        colorHex: "#ffffff",
        stock: 5,
        lowStockThreshold: 5,
        weightGrams: 100,
        isActive: true,
      }),
    ).rejects.toThrow(ProductActionError);
  });
});

describe("bulkUpdateStock", () => {
  it("rejects a negative stock value without writing anything", async () => {
    const category = await createCategory({ slug: unique("cat"), name: "Cat" });
    cleanupCategoryIds.push(category.id);
    const product = await createProduct({
      slug: unique("prod"),
      title: "Product",
      description: "desc",
      categoryId: category.id,
      collectionIds: [],
      status: "DRAFT",
      fabric: "Chiffon",
      basePricePaise: 10000,
    });
    cleanupProductIds.push(product.id);
    const variant = await createVariant(product.id, {
      sku: unique("SKU"),
      colorName: "Black",
      colorHex: "#000000",
      stock: 10,
      lowStockThreshold: 5,
      weightGrams: 100,
      isActive: true,
    });

    await expect(
      bulkUpdateStock([{ variantId: variant.id, stock: -1 }]),
    ).rejects.toThrow(InventoryActionError);

    const unchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(unchanged.stock).toBe(10);
  });

  it("applies all updates atomically in one transaction", async () => {
    const category = await createCategory({ slug: unique("cat"), name: "Cat" });
    cleanupCategoryIds.push(category.id);
    const product = await createProduct({
      slug: unique("prod"),
      title: "Product",
      description: "desc",
      categoryId: category.id,
      collectionIds: [],
      status: "DRAFT",
      fabric: "Chiffon",
      basePricePaise: 10000,
    });
    cleanupProductIds.push(product.id);
    const v1 = await createVariant(product.id, {
      sku: unique("SKU"),
      colorName: "Black",
      colorHex: "#000000",
      stock: 10,
      lowStockThreshold: 5,
      weightGrams: 100,
      isActive: true,
    });
    const v2 = await createVariant(product.id, {
      sku: unique("SKU"),
      colorName: "White",
      colorHex: "#ffffff",
      stock: 20,
      lowStockThreshold: 5,
      weightGrams: 100,
      isActive: true,
    });

    await bulkUpdateStock([
      { variantId: v1.id, stock: 3 },
      { variantId: v2.id, stock: 7 },
    ]);

    const [updated1, updated2] = await Promise.all([
      prisma.productVariant.findUniqueOrThrow({ where: { id: v1.id } }),
      prisma.productVariant.findUniqueOrThrow({ where: { id: v2.id } }),
    ]);
    expect(updated1.stock).toBe(3);
    expect(updated2.stock).toBe(7);
  });
});
