"use client";

import Link from "next/link";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { addToCart } from "@/actions/cart";
import { formatINR } from "@/lib/money";
import { designProductPhoto } from "@/lib/design-placeholder-images";
import { WishlistButton } from "@/components/shop/wishlist-button";
import type { ProductCard as ProductCardData } from "@/lib/catalog";

// Shared between the homepage's "New Arrivals" grid and the /shop listing
// grid — both derive from the same Stitch "Atelier Hijab" design, so one
// card styling serves both. NOT used by the original ProductCard's callers
// (search, collections) — those keep their existing look.
//
// The mockup shows a star rating on every card; this app has no
// reviews/ratings feature (explicitly scoped out of v1), so that's left
// out rather than faked. "Quick Add" is wired to the real addToCart action
// against the product's first in-stock variant, and the wishlist heart to
// the real toggleWishlistAction — neither is decorative.
export function DesignProductCard({
  product,
  photoIndex,
  wishlisted = false,
}: {
  product: ProductCardData;
  photoIndex: number;
  wishlisted?: boolean;
}) {
  const defaultVariant = product.variants.find((v) => v.stock > 0);
  const inStock = Boolean(defaultVariant);
  const colors = [
    ...new Map(product.variants.map((v) => [v.colorName, v])).values(),
  ].slice(0, 4);

  const action = useAction(addToCart, {
    onSuccess: () => toast.success(`${product.title} added to your bag.`),
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't add to bag."),
  });

  const quickAddPricePaise = defaultVariant?.pricePaise ?? product.basePricePaise;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-[#fdfbf7] shadow-[0_4px_20px_-4px_rgba(34,31,31,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_32px_-6px_rgba(34,31,31,0.07)]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f1ede8]">
        <Image
          src={designProductPhoto(photoIndex)}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!inStock && (
          <span className="font-jakarta absolute top-3 left-3 rounded-full bg-[#fdf9f4]/90 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#090707] uppercase backdrop-blur-sm">
            Sold out
          </span>
        )}
        {product.compareAtPaise && inStock && (
          <span className="font-jakarta absolute top-3 left-3 rounded-full bg-[#79564f] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white uppercase">
            Sale
          </span>
        )}
        <WishlistButton
          productId={product.id}
          initialWishlisted={wishlisted}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#fdf9f4]/90 text-[#4d4545] shadow-sm backdrop-blur-sm transition-colors hover:text-[#79564f]"
        />
        {inStock && defaultVariant && (
          <button
            type="button"
            disabled={action.isExecuting}
            onClick={() => action.execute({ variantId: defaultVariant.id, quantity: 1 })}
            className="font-jakarta absolute inset-x-4 bottom-4 z-10 translate-y-3 rounded-full bg-[#090707] py-2.5 text-[13px] font-semibold tracking-wider text-white uppercase opacity-0 shadow-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-[#79564f] disabled:opacity-60"
          >
            {action.isExecuting ? "Adding…" : `Quick Add • ${formatINR(quickAddPricePaise)}`}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        <span className="font-jakarta text-[11px] tracking-widest text-[#79564f] uppercase">
          {product.fabric}
        </span>
        <h3 className="font-jakarta mt-0.5 line-clamp-1 text-[15px] font-semibold text-[#1c1c19] group-hover:text-[#79564f]">
          {product.title}
        </h3>
        <div className="mt-1.5 flex items-center justify-between border-t border-[#f1ede8] pt-2">
          <span className="font-jakarta text-[18px] font-semibold text-[#1c1c19]">
            {formatINR(product.basePricePaise)}
          </span>
          {colors.length > 0 && (
            <div className="flex items-center gap-1.5">
              {colors.map((variant) => (
                <span
                  key={variant.id}
                  className="h-3.5 w-3.5 rounded-full shadow-sm"
                  style={{ backgroundColor: variant.colorHex }}
                  title={variant.colorName}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Link
        href={`/product/${product.slug}`}
        className="absolute inset-0"
        aria-label={product.title}
      >
        <span className="sr-only">{product.title}</span>
      </Link>
    </article>
  );
}
