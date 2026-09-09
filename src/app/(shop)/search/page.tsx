import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { searchProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

async function SearchResults({ query, page }: { query: string; page: number }) {
  if (!query) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        Search for a fabric, color, or product name.
      </p>
    );
  }

  const { results, total, pageCount } = await searchProducts(query, page);

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        No products found for &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-6 text-sm">
        {total} result{total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {results.map((product) => (
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
              href={`/search?q=${encodeURIComponent(query)}&page=${p}`}
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

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-4/5 w-full rounded-lg" />
      ))}
    </div>
  );
}

// `searchParams` is a runtime API — everything that reads it (the input's
// current value included, since it reflects the current query) has to sit
// behind the Suspense boundary, not the page itself. Same fix as the
// /login, /reset-password, and /verify-email pages in Phase 2.
async function SearchPageContent({ searchParams }: Props) {
  const { q, page } = await searchParams;
  const query = q ?? "";
  const pageNum = Math.max(1, Number(page) || 1);

  return (
    <>
      <form action="/search" className="mb-8 max-w-md">
        <Input name="q" defaultValue={query} placeholder="Search hijabs…" autoFocus />
      </form>
      <SearchResults query={query} page={pageNum} />
    </>
  );
}

export default function SearchPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
