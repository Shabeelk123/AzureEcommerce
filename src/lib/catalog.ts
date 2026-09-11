import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// All catalog reads are Cache-Components-cached: `"use cache"` marks the
// result cacheable and eligible for the prerendered static shell,
// `cacheTag` gives Phase 7's admin writes a precise handle to invalidate
// with `revalidateTag`/`updateTag`, and `cacheLife("days")` (stale 5m,
// revalidate 1d, expire 1w) means even *without* an explicit invalidation
// the catalog self-heals within a day. Tag-based invalidation is the
// primary mechanism; the time-based lifetime is the safety net.
// See node_modules/next/dist/docs/.../09-revalidating.md.

const PAGE_SIZE = 12;

export type SortOption = "newest" | "price-asc" | "price-desc";

export type ProductFilters = {
  categorySlug?: string;
  collectionSlug?: string;
  colors?: string[];
  fabrics?: string[];
  minPricePaise?: number;
  maxPricePaise?: number;
  sort?: SortOption;
  page?: number;
};

// Selected fields only — this shape is what every listing card needs and
// no more. `variants` is trimmed to what's needed to render a color swatch
// row and know whether *anything* is purchasable; the product page fetches
// the full variant list separately.
export const productCardSelect = {
  id: true,
  slug: true,
  title: true,
  basePricePaise: true,
  compareAtPaise: true,
  fabric: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  variants: {
    select: { id: true, colorName: true, colorHex: true, stock: true, pricePaise: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

function sortToOrderBy(
  sort: SortOption | undefined,
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { basePricePaise: "asc" };
    case "price-desc":
      return { basePricePaise: "desc" };
    case "newest":
    default:
      return { publishedAt: "desc" };
  }
}

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    publishedAt: { not: null },
  };

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }
  if (filters.collectionSlug) {
    where.collections = { some: { slug: filters.collectionSlug } };
  }
  if (filters.fabrics?.length) {
    where.fabric = { in: filters.fabrics };
  }
  if (filters.colors?.length) {
    where.variants = { some: { colorName: { in: filters.colors }, isActive: true } };
  }
  if (filters.minPricePaise != null || filters.maxPricePaise != null) {
    // Price range is intentionally checked against Product.basePricePaise,
    // not per-variant pricePaise overrides — variant overrides in this
    // catalog are small deltas (a longer length, say), not different price
    // tiers, so filtering on the base price is the right granularity for
    // "show me hijabs under ₹800" without a much more expensive query that
    // joins and dedupes on variant price.
    where.basePricePaise = {
      ...(filters.minPricePaise != null ? { gte: filters.minPricePaise } : {}),
      ...(filters.maxPricePaise != null ? { lte: filters.maxPricePaise } : {}),
    };
  }

  return where;
}

export async function getProducts(filters: ProductFilters = {}): Promise<{
  products: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
}> {
  "use cache";
  cacheTag("products");
  cacheLife("days");

  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: sortToOrderBy(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getNewArrivals(limit = 8): Promise<ProductCard[]> {
  "use cache";
  cacheTag("products");
  cacheLife("days");

  return prisma.product.findMany({
    where: { status: "ACTIVE", publishedAt: { not: null } },
    select: productCardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheTag("products", `product:${slug}`);
  cacheLife("days");

  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { colorName: "asc" } },
    },
  });
}

/** Products sharing the same category as `productId`, for a "related products" rail. */
export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductCard[]> {
  "use cache";
  cacheTag("products");
  cacheLife("days");

  return prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId,
      status: "ACTIVE",
      publishedAt: { not: null },
    },
    select: productCardSelect,
    take: limit,
  });
}

export async function getCategories() {
  "use cache";
  cacheTag("categories");
  cacheLife("days");

  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

/** Categories with a real count of their purchasable (ACTIVE, published)
 * products — powers the shop page's category pill counts. */
export async function getCategoriesWithProductCounts() {
  "use cache";
  cacheTag("categories", "products");
  cacheLife("days");

  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { status: "ACTIVE", publishedAt: { not: null } } } } },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheTag("categories", `category:${slug}`);
  cacheLife("days");

  return prisma.category.findUnique({ where: { slug } });
}

export async function getCollections(options: { featuredOnly?: boolean } = {}) {
  "use cache";
  cacheTag("collections");
  cacheLife("days");

  return prisma.collection.findMany({
    where: options.featuredOnly ? { isFeatured: true } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCollectionBySlug(slug: string) {
  "use cache";
  cacheTag("collections", `collection:${slug}`);
  cacheLife("days");

  return prisma.collection.findUnique({ where: { slug } });
}

/** Distinct fabric and color values across active products, for filter UI. */
export async function getFilterOptions() {
  "use cache";
  cacheTag("products");
  cacheLife("days");

  const [fabrics, colors] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { fabric: true },
      distinct: ["fabric"],
      orderBy: { fabric: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE" } },
      select: { colorName: true, colorHex: true },
      distinct: ["colorName"],
      orderBy: { colorName: "asc" },
    }),
  ]);

  return {
    fabrics: fabrics.map((f) => f.fabric),
    colors: colors.map((c) => ({ name: c.colorName, hex: c.colorHex })),
  };
}

export type SearchResult = ProductCard & { rank: number };

// What the raw query actually returns — flat columns plus rank, no nested
// relations. Kept distinct from `SearchResult` (the merged shape callers
// get back) so the type doesn't lie about what $queryRaw hands us.
type SearchRow = {
  id: string;
  slug: string;
  title: string;
  basePricePaise: number;
  compareAtPaise: number | null;
  fabric: string;
  rank: number;
};

/**
 * Full-text search against Product.searchVector (see the migration that
 * added it). Prisma has no query-builder support for tsvector/tsquery, so
 * this drops to `$queryRaw` — the one place in the catalog layer that
 * isn't a type-safe Prisma call. `websearch_to_tsquery` (rather than
 * `plainto_tsquery`) is what lets a shopper type `"eid gift" -black` and
 * get a phrase match with an exclusion, the way a search box is expected
 * to behave.
 *
 * Deliberately NOT cached: search is long-tail (thousands of distinct
 * queries, each cached once) and must reflect current stock/catalog
 * immediately — the cache-hit rate would be near zero while still paying
 * for cache bookkeeping.
 */
export async function searchProducts(
  query: string,
  page = 1,
): Promise<{
  results: SearchResult[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], total: 0, page: 1, pageCount: 1 };

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * PAGE_SIZE;

  const [results, countRows] = await Promise.all([
    prisma.$queryRaw<SearchRow[]>`
      SELECT
        p.id, p.slug, p.title, p."basePricePaise", p."compareAtPaise", p.fabric,
        ts_rank(p."searchVector", websearch_to_tsquery('english', ${trimmed})) AS rank
      FROM "Product" p
      WHERE p.status = 'ACTIVE'
        AND p."searchVector" @@ websearch_to_tsquery('english', ${trimmed})
      ORDER BY rank DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM "Product" p
      WHERE p.status = 'ACTIVE'
        AND p."searchVector" @@ websearch_to_tsquery('english', ${trimmed})
    `,
  ]);

  // Raw results don't carry the nested image/variant relations the card
  // component expects — fetch those in one follow-up query, keyed by id.
  const ids = results.map((r) => r.id);
  const withRelations = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: productCardSelect,
      })
    : [];
  const byId = new Map(withRelations.map((p) => [p.id, p]));

  const total = Number(countRows[0]?.count ?? BigInt(0));
  return {
    // Filter out the (should-never-happen) case where a raw-query id has
    // no match in the follow-up fetch, rather than asserting non-null and
    // risking a runtime crash on the product page.
    results: results.flatMap((r) => {
      const card = byId.get(r.id);
      return card ? [{ ...card, ...r }] : [];
    }),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
