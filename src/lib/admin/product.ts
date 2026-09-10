import "server-only";
import { invalidateTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import type { ProductStatus } from "@/generated/prisma/client";

export class ProductActionError extends Error {}

const PAGE_SIZE = 20;

export type AdminProductFilters = {
  status?: ProductStatus;
  search?: string;
  page?: number;
};

export async function listProductsForAdmin(filters: AdminProductFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { slug: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { stock: true, isActive: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProductForAdmin(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      collections: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type ProductInput = {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  collectionIds: string[];
  status: ProductStatus;
  fabric: string;
  careInstructions?: string | null;
  basePricePaise: number;
  compareAtPaise?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing && existing.id !== excludeId) {
    throw new ProductActionError(`Slug "${slug}" is already in use.`);
  }
}

export async function createProduct(input: ProductInput) {
  await assertUniqueSlug(input.slug);

  const product = await prisma.product.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      status: input.status,
      fabric: input.fabric,
      careInstructions: input.careInstructions,
      basePricePaise: input.basePricePaise,
      compareAtPaise: input.compareAtPaise,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      publishedAt: input.status === "ACTIVE" ? new Date() : null,
      collections: { connect: input.collectionIds.map((id) => ({ id })) },
    },
  });
  invalidateTag("products");
  return product;
}

export async function updateProduct(id: string, input: ProductInput) {
  await assertUniqueSlug(input.slug, id);

  const before = await prisma.product.findUnique({ where: { id }, select: { status: true, slug: true } });
  if (!before) throw new ProductActionError("Product not found.");

  const product = await prisma.product.update({
    where: { id },
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      status: input.status,
      fabric: input.fabric,
      careInstructions: input.careInstructions,
      basePricePaise: input.basePricePaise,
      compareAtPaise: input.compareAtPaise,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      // Only stamp publishedAt the first time a product goes ACTIVE — a
      // later DRAFT<->ACTIVE toggle shouldn't reset its original publish date.
      publishedAt:
        input.status === "ACTIVE" && before.status !== "ACTIVE" ? new Date() : undefined,
      collections: { set: input.collectionIds.map((cid) => ({ id: cid })) },
    },
  });
  invalidateTag("products");
  invalidateTag(`product:${before.slug}`);
  invalidateTag(`product:${input.slug}`);
  return product;
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) throw new ProductActionError("Product not found.");

  const orderItemCount = await prisma.orderItem.count({
    where: { variant: { productId: id } },
  });
  if (orderItemCount > 0) {
    throw new ProductActionError(
      "This product has been ordered before and can't be deleted — archive it instead.",
    );
  }

  await prisma.product.delete({ where: { id } });
  invalidateTag("products");
  invalidateTag(`product:${product.slug}`);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function addProductImage(params: {
  productId: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}) {
  const maxSort = await prisma.productImage.aggregate({
    where: { productId: params.productId },
    _max: { sortOrder: true },
  });
  const image = await prisma.productImage.create({
    data: { ...params, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
  });
  invalidateTag("products");
  return image;
}

export async function deleteProductImage(id: string) {
  const image = await prisma.productImage.delete({ where: { id } }).catch(() => {
    throw new ProductActionError("Image not found.");
  });
  invalidateTag("products");
  return image;
}

export async function reorderProductImages(productId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  invalidateTag("products");
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export type VariantInput = {
  sku: string;
  colorName: string;
  colorHex: string;
  size?: string | null;
  length?: string | null;
  pricePaise?: number | null;
  stock: number;
  lowStockThreshold: number;
  weightGrams: number;
  isActive: boolean;
};

export async function createVariant(productId: string, input: VariantInput) {
  const existingSku = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw new ProductActionError(`SKU "${input.sku}" is already in use.`);

  const variant = await prisma.productVariant
    .create({ data: { productId, ...input } })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ProductActionError(
          "A variant with this color/size combination already exists for this product.",
        );
      }
      throw error;
    });
  invalidateTag("products");
  return variant;
}

export async function updateVariant(id: string, input: VariantInput) {
  const existingSku = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
  if (existingSku && existingSku.id !== id) {
    throw new ProductActionError(`SKU "${input.sku}" is already in use.`);
  }

  const variant = await prisma.productVariant
    .update({ where: { id }, data: input })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ProductActionError(
          "A variant with this color/size combination already exists for this product.",
        );
      }
      throw new ProductActionError("Variant not found.");
    });
  invalidateTag("products");
  return variant;
}

export async function deleteVariant(id: string) {
  const orderItemCount = await prisma.orderItem.count({ where: { variantId: id } });
  if (orderItemCount > 0) {
    throw new ProductActionError(
      "This variant has been ordered before and can't be deleted — deactivate it instead.",
    );
  }
  const variant = await prisma.productVariant.delete({ where: { id } }).catch(() => {
    throw new ProductActionError("Variant not found.");
  });
  invalidateTag("products");
  return variant;
}
