import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/money";
import type { ProductCard as ProductCardData } from "@/lib/catalog";

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const inStock = product.variants.some((v) => v.stock > 0);
  const colors = [
    ...new Map(product.variants.map((v) => [v.colorName, v])).values(),
  ].slice(0, 5);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-muted relative aspect-4/5 overflow-hidden rounded-lg">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            No image
          </div>
        )}
        {!inStock && (
          <span className="bg-background/90 absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Sold out
          </span>
        )}
        {product.compareAtPaise && inStock && (
          <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
            Sale
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-foreground text-sm font-medium">{product.title}</h3>
        <p className="text-muted-foreground text-xs">{product.fabric}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {formatINR(product.basePricePaise)}
          </span>
          {product.compareAtPaise && (
            <span className="text-muted-foreground text-xs line-through">
              {formatINR(product.compareAtPaise)}
            </span>
          )}
        </div>
        {colors.length > 0 && (
          <div className="flex gap-1 pt-1">
            {colors.map((variant) => (
              <span
                key={variant.id}
                className="border-border h-3.5 w-3.5 rounded-full border"
                style={{ backgroundColor: variant.colorHex }}
                title={variant.colorName}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
