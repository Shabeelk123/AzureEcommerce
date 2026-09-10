import "server-only";
import { invalidateTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export async function listVariantsForInventory(params: { search?: string; lowStockOnly?: boolean }) {
  const variants = await prisma.productVariant.findMany({
    where: {
      ...(params.search
        ? {
            OR: [
              { sku: { contains: params.search, mode: "insensitive" as const } },
              { product: { title: { contains: params.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { product: { select: { title: true, slug: true } } },
    orderBy: [{ product: { title: "asc" } }, { colorName: "asc" }],
  });

  if (!params.lowStockOnly) return variants;
  return variants.filter((v) => v.stock <= v.lowStockThreshold);
}

export class InventoryActionError extends Error {}

/** One row per variant to update. Applied as a single transaction so a
 * partial failure (e.g. a stale variant id) never leaves some rows updated
 * and others not — the admin sees one clean success or one clean error. */
export async function bulkUpdateStock(updates: { variantId: string; stock: number }[]) {
  if (updates.some((u) => u.stock < 0)) {
    throw new InventoryActionError("Stock cannot be negative.");
  }
  await prisma.$transaction(
    updates.map((u) =>
      prisma.productVariant.update({ where: { id: u.variantId }, data: { stock: u.stock } }),
    ),
  );
  invalidateTag("products");
}
