import Link from "next/link";
import { Suspense } from "react";
import { getFilterOptions, getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type RawSearchParams,
  hasActiveFilters,
  isListParamActive,
  pageHref,
  parseFilters,
  priceBands,
  sortHref,
  SORT_OPTIONS,
  toggleListParamHref,
  withParams,
} from "@/lib/shop-url";

// Every component below takes the *promise* Next hands the page for
// `searchParams`, not the resolved value — awaiting it happens inside each
// component, each already sitting behind its own <Suspense> boundary. The
// alternative (await once in `ShopListing` and pass the resolved object
// down) puts that await above both Suspense boundaries, which blocks the
// entire route's static shell from prerendering — the same
// blocking-prerender-dynamic failure the /login page hit in Phase 2, one
// call-site further up the tree.

async function FiltersSidebar({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: Promise<RawSearchParams>;
}) {
  const [resolved, { fabrics, colors }] = await Promise.all([
    searchParams,
    getFilterOptions(),
  ]);

  return (
    <aside className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Price</h3>
        <ul className="space-y-2">
          {priceBands(basePath, resolved).map((band) => (
            <li key={band.key}>
              <Link
                href={band.href}
                className={`text-sm ${band.active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {band.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {fabrics.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Fabric</h3>
          <ul className="space-y-2">
            {fabrics.map((fabric) => {
              const active = isListParamActive(resolved, "fabric", fabric);
              return (
                <li key={fabric}>
                  <Link
                    href={toggleListParamHref(basePath, resolved, "fabric", fabric)}
                    className={`text-sm ${active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {fabric}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Color</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = isListParamActive(resolved, "color", color.name);
              return (
                <Link
                  key={color.name}
                  href={toggleListParamHref(basePath, resolved, "color", color.name)}
                  title={color.name}
                  className={`h-7 w-7 rounded-full border-2 ${active ? "border-primary" : "border-transparent"}`}
                >
                  <span
                    className="border-border block h-full w-full rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {hasActiveFilters(resolved) && (
        <Link href={basePath} className="text-primary text-sm hover:underline">
          Clear all filters
        </Link>
      )}
    </aside>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

async function ProductGrid({
  basePath,
  categorySlug,
  collectionSlug,
  searchParams,
}: {
  basePath: string;
  categorySlug?: string;
  collectionSlug?: string;
  searchParams: Promise<RawSearchParams>;
}) {
  const resolved = await searchParams;
  const filters = parseFilters(resolved, { categorySlug, collectionSlug });
  const { products, total, page, pageCount } = await getProducts(filters);

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-24 text-center text-sm">
        No products match these filters.{" "}
        <Link href={basePath} className="text-primary hover:underline">
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{total} products</p>
        <div className="flex gap-3 text-sm">
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={sortHref(basePath, resolved, option.value)}
              className={
                filters.sort === option.value
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {pageCount > 1 && (
        <nav
          className="mt-10 flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(basePath, resolved, p)}
              className={`flex h-9 w-9 items-center justify-center rounded-md text-sm ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-4/5 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ShopListing({
  title,
  description,
  basePath,
  categorySlug,
  collectionSlug,
  searchParams,
}: {
  title: string;
  description?: string;
  basePath: string;
  categorySlug?: string;
  collectionSlug?: string;
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersSidebar basePath={basePath} searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<GridSkeleton />}>
          <ProductGrid
            basePath={basePath}
            categorySlug={categorySlug}
            collectionSlug={collectionSlug}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Re-exported for pages that need to build a link into a filtered view
// (e.g. a category tile linking to `/shop?fabric=...`).
export { withParams };
