import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getWishlistCount, getWishlistProductIds, toggleWishlistItem } from "@/lib/wishlist";

let userId: string;
let categoryId: string;
let productId: string;

async function setup() {
  const suffix = crypto.randomUUID();

  const user = await prisma.user.create({
    data: {
      email: `wishlist-${suffix}@example.com`,
      passwordHash: await hashPassword("Password123!"),
    },
  });
  userId = user.id;

  const category = await prisma.category.create({
    data: { slug: `cat-${suffix}`, name: "Test Category" },
  });
  categoryId = category.id;

  const product = await prisma.product.create({
    data: {
      slug: `product-${suffix}`,
      title: "Test Hijab",
      description: "A test product",
      categoryId,
      fabric: "Test Fabric",
      basePricePaise: 79900,
      status: "ACTIVE",
    },
  });
  productId = product.id;
}

afterEach(async () => {
  await prisma.wishlistItem.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("toggleWishlistItem", () => {
  it("adds the product on first toggle, removes it on second", async () => {
    await setup();

    const first = await toggleWishlistItem(userId, productId);
    expect(first.wishlisted).toBe(true);
    expect((await getWishlistProductIds(userId)).has(productId)).toBe(true);
    expect(await getWishlistCount(userId)).toBe(1);

    const second = await toggleWishlistItem(userId, productId);
    expect(second.wishlisted).toBe(false);
    expect((await getWishlistProductIds(userId)).has(productId)).toBe(false);
    expect(await getWishlistCount(userId)).toBe(0);
  });

  it("is scoped per user — one user's wishlist doesn't affect another's", async () => {
    await setup();
    const otherUser = await prisma.user.create({
      data: { email: `other-${crypto.randomUUID()}@example.com` },
    });

    await toggleWishlistItem(userId, productId);

    expect((await getWishlistProductIds(userId)).has(productId)).toBe(true);
    expect((await getWishlistProductIds(otherUser.id)).has(productId)).toBe(false);

    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});
