"use client";

import { useState } from "react";
import { Grid3x3, LayoutGrid } from "lucide-react";
import { DesignProductCard } from "@/components/shop/design-product-card";
import type { ProductCard as ProductCardData } from "@/lib/catalog";

// Purely cosmetic client-side layout preference — 3 vs 4 columns on large
// screens — no data or filter/sort state involved, so it's safe to keep
// as local component state rather than a URL param.
export function ProductGridDensity({
  products,
  wishlistedIds = [],
}: {
  products: ProductCardData[];
  // Plain array, not a Set — a Set crossing the server->client RSC
  // boundary as a prop is best avoided; array-of-strings is unambiguous JSON.
  wishlistedIds?: string[];
}) {
  const wishlistedSet = new Set(wishlistedIds);
  const [cols, setCols] = useState<3 | 4>(4);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="hidden items-center gap-1 rounded-full bg-[#f1ede8] p-1 lg:flex">
          <button
            type="button"
            aria-label="4 columns"
            onClick={() => setCols(4)}
            className={`rounded-full p-1.5 transition-all ${cols === 4 ? "bg-[#fdfbf7] text-[#090707] shadow-sm" : "text-[#4d4545] hover:text-[#090707]"}`}
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            aria-label="3 columns"
            onClick={() => setCols(3)}
            className={`rounded-full p-1.5 transition-all ${cols === 3 ? "bg-[#fdfbf7] text-[#090707] shadow-sm" : "text-[#4d4545] hover:text-[#090707]"}`}
          >
            <Grid3x3 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
      <div
        className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
      >
        {products.map((product, index) => (
          <DesignProductCard
            key={product.id}
            product={product}
            photoIndex={index}
            wishlisted={wishlistedSet.has(product.id)}
          />
        ))}
      </div>
    </div>
  );
}
