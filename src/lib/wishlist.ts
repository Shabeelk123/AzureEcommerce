import "server-only";
import { prisma } from "@/lib/prisma";
import { productCardSelect, type ProductCard } from "@/lib/catalog";

/**
 * Logged-in accounts only — there's no guest wishlist (see Cart's
 * sessionToken cookie for what that would look like if this ever needs
 * one). Deliberately NOT cached: a heart icon's state is per-viewer and
 * changes on every toggle — the same "always read live" rationale as
 * src/lib/coupon.ts's validateCoupon.
 */

export async function getWishlistCount(userId: string): Promise<number> {
  return prisma.wishlistItem.count({ where: { userId } });
}

export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return new Set(items.map((i) => i.productId));
}

export async function getWishlistForUser(
  userId: string,
): Promise<{ id: string; createdAt: Date; product: ProductCard }[]> {
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      product: { select: productCardSelect },
    },
  });
}

/** Adds or removes a product from the user's wishlist, returning the new state. */
export async function toggleWishlistItem(
  userId: string,
  productId: string,
): Promise<{ wishlisted: boolean }> {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { wishlisted: false };
  }

  await prisma.wishlistItem.create({ data: { userId, productId } });
  return { wishlisted: true };
}
