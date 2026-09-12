import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Leaf, ShieldCheck, Wind, X } from "lucide-react";
import { getFilterOptions, getProducts } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWishlistProductIds } from "@/lib/wishlist";
import { HrefSelect } from "@/components/shop/href-select";
import { ProductGridDensity } from "@/components/shop/product-grid-density";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type RawSearchParams,
  FABRIC_FAMILIES,
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

function FabricChips({ basePath, resolved }: { basePath: string; resolved: RawSearchParams }) {
  const activeClass = "bg-[#090707] text-white";
  const inactiveClass = "bg-[#f1ede8] text-[#1c1c19] hover:bg-[#ebe8e3]";

  return (
    <div className="no-scrollbar flex max-w-full shrink-0 items-center gap-2 overflow-x-auto pb-1">
      {FABRIC_FAMILIES.map((fabric) => {
        const active = isListParamActive(resolved, "fabric", fabric);
        return (
          <Link
            key={fabric}
            href={toggleListParamHref(basePath, resolved, "fabric", fabric)}
            className={`font-jakarta shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold tracking-wide transition-all ${active ? activeClass : inactiveClass}`}
          >
            {fabric}
          </Link>
        );
      })}
    </div>
  );
}

async function FilterBar({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: Promise<RawSearchParams>;
}) {
  const [resolved, { colors }] = await Promise.all([searchParams, getFilterOptions()]);
  const filters = parseFilters(resolved);

  const priceOptions = [
    { value: "", label: "All Prices", href: withParams(basePath, resolved, { price: undefined }) },
    ...priceBands(basePath, resolved).map((band) => ({
      value: band.key,
      label: band.label,
      href: band.active ? withParams(basePath, resolved, { price: undefined }) : band.href,
    })),
  ];
  const activePrice = priceBands(basePath, resolved).find((b) => b.active);

  const sortOptions = SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    href: sortHref(basePath, resolved, option.value),
  }));

  const selectClass =
    "font-jakarta appearance-none rounded-full bg-[#fdfbf7] py-2 pr-8 pl-3.5 text-[13px] text-[#1c1c19] shadow-sm focus:ring-1 focus:ring-[#9e7770] focus:outline-none";

  return (
    <div className="space-y-4 rounded-xl bg-[#f7f3ee] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FabricChips basePath={basePath} resolved={resolved} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative inline-block">
            <HrefSelect
              ariaLabel="Filter by price"
              value={activePrice?.key ?? ""}
              options={priceOptions}
              className={selectClass}
            />
          </div>

          <div className="relative inline-block">
            <HrefSelect
              ariaLabel="Sort products"
              value={filters.sort ?? "newest"}
              options={sortOptions}
              className={`${selectClass} font-medium text-[#090707]`}
            />
          </div>
        </div>
      </div>

      {colors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e6e2dd] pt-3">
          <span className="font-jakarta mr-1 text-[11px] font-semibold tracking-widest text-[#4d4545] uppercase">
            Shade
          </span>
          {colors.map((color) => {
            const active = isListParamActive(resolved, "color", color.name);
            return (
              <Link
                key={color.name}
                href={toggleListParamHref(basePath, resolved, "color", color.name)}
                title={color.name}
                aria-label={`Filter ${color.name}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110 ${active ? "ring-2 ring-[#090707] ring-offset-2" : ""}`}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </div>
      )}

      {hasActiveFilters(resolved) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e6e2dd] pt-3">
          <span className="font-jakarta mr-1 text-[11px] font-semibold tracking-widest text-[#4d4545] uppercase">
            Active
          </span>
          {(filters.fabrics ?? []).map((fabric) => (
            <Link
              key={`fabric-${fabric}`}
              href={toggleListParamHref(basePath, resolved, "fabric", fabric)}
              className="font-jakarta inline-flex items-center gap-1.5 rounded-full bg-[#ebe8e3] px-3 py-1 text-[12px] text-[#1c1c19]"
            >
              Fabric: <strong>{fabric}</strong>
              <X className="h-3 w-3" />
            </Link>
          ))}
          {(filters.colors ?? []).map((color) => (
            <Link
              key={`color-${color}`}
              href={toggleListParamHref(basePath, resolved, "color", color)}
              className="font-jakarta inline-flex items-center gap-1.5 rounded-full bg-[#ebe8e3] px-3 py-1 text-[12px] text-[#1c1c19]"
            >
              Color: <strong>{color}</strong>
              <X className="h-3 w-3" />
            </Link>
          ))}
          {activePrice && (
            <Link
              href={withParams(basePath, resolved, { price: undefined })}
              className="font-jakarta inline-flex items-center gap-1.5 rounded-full bg-[#ebe8e3] px-3 py-1 text-[12px] text-[#1c1c19]"
            >
              {activePrice.label}
              <X className="h-3 w-3" />
            </Link>
          )}
          <Link
            href={basePath}
            className="font-jakarta ml-1 text-[12px] font-semibold tracking-wide text-[#79564f] underline"
          >
            Clear All
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterBarSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
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
  const [{ products, total, page, pageCount }, user] = await Promise.all([
    getProducts(filters),
    getCurrentUser(),
  ]);
  const wishlistedIds = user ? [...(await getWishlistProductIds(user.id))] : [];

  if (products.length === 0) {
    return (
      <div className="font-jakarta rounded-xl border border-dashed border-[#d0c4c4] py-24 text-center text-sm text-[#4d4545]">
        No products match these filters.{" "}
        <Link href={basePath} className="font-semibold text-[#79564f] underline">
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ProductGridDensity products={products} wishlistedIds={wishlistedIds} />

      {pageCount > 1 && (
        <nav
          className="mt-14 flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(basePath, resolved, p)}
              className={`font-jakarta flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold transition-colors ${
                p === page
                  ? "bg-[#090707] text-white"
                  : "bg-[#f1ede8] text-[#4d4545] hover:bg-[#ebe8e3] hover:text-[#090707]"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}

      <p className="font-jakarta mt-4 text-center text-[13px] text-[#4d4545]">
        Showing <strong className="text-[#090707]">{products.length}</strong> of{" "}
        <strong className="text-[#090707]">{total}</strong> curated drapes
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-3/4 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

async function ProductCountPill({
  categorySlug,
  collectionSlug,
  searchParams,
}: {
  categorySlug?: string;
  collectionSlug?: string;
  searchParams: Promise<RawSearchParams>;
}) {
  const resolved = await searchParams;
  const filters = parseFilters(resolved, { categorySlug, collectionSlug });
  const { total } = await getProducts(filters);
  return (
    <div className="font-jakarta inline-flex items-center gap-2 rounded-full bg-[#f7f3ee] px-4 py-2 text-[11px] font-semibold tracking-widest text-[#1c1c19] uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-[#79564f]" />
      {total} {total === 1 ? "Product" : "Products"} Available
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
    <div className="font-jakarta bg-[#fdf9f4]">
      <section className="mx-auto w-full max-w-360 px-5 pt-6 pb-8 md:px-10 lg:px-16">
        <nav className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#4d4545] uppercase">
          <Link href="/" className="transition-colors hover:text-[#090707]">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 opacity-40" />
          <span className="text-[#090707]">{title}</span>
        </nav>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="font-playfair text-3xl text-[#090707] md:text-[40px]">{title}</h1>
            {description && (
              <p className="mt-2 max-w-xl text-base leading-relaxed text-[#4d4545]">
                {description}
              </p>
            )}
          </div>
          <Suspense fallback={<Skeleton className="h-9 w-40 rounded-full" />}>
            <ProductCountPill
              categorySlug={categorySlug}
              collectionSlug={collectionSlug}
              searchParams={searchParams}
            />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto mb-8 w-full max-w-360 px-5 md:px-10 lg:px-16">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar basePath={basePath} searchParams={searchParams} />
        </Suspense>
      </section>

      <section className="mx-auto w-full max-w-360 px-5 pb-24 md:px-10 lg:px-16">
        <Suspense fallback={<GridSkeleton />}>
          <ProductGrid
            basePath={basePath}
            categorySlug={categorySlug}
            collectionSlug={collectionSlug}
            searchParams={searchParams}
          />
        </Suspense>
      </section>

      <section className="w-full bg-[#f7f3ee] py-16">
        <div className="mx-auto grid max-w-360 grid-cols-1 gap-8 px-5 md:grid-cols-3 md:px-10 lg:px-16">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ede8] text-[#090707]">
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-[#090707]">Breathable Fabrics</h4>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Jersey, modal, georgette, and chiffon chosen for all-day comfort without
                overheating.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ede8] text-[#090707]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-[#090707]">Secure Checkout</h4>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Every order is processed through Razorpay&rsquo;s encrypted payment gateway.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ede8] text-[#090707]">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-[#090707]">Thoughtfully Sourced</h4>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Fabrics selected for quality and softness, from mills we trust.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-exported for pages that need to build a link into a filtered view
// (e.g. a category tile linking to `/shop?fabric=...`).
export { withParams };
