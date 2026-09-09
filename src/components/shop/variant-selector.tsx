"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { addToCart } from "@/actions/cart";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";

type Variant = {
  id: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  pricePaise: number | null;
  stock: number;
  lowStockThreshold: number;
};

export function VariantSelector({
  variants,
  basePricePaise,
  compareAtPaise,
}: {
  variants: Variant[];
  basePricePaise: number;
  compareAtPaise: number | null;
}) {
  const colors = useMemo(
    () => [...new Map(variants.map((v) => [v.colorName, v])).values()],
    [variants],
  );
  const router = useRouter();
  const addAction = useAction(addToCart, {
    onSuccess: () => {
      toast.success("Added to cart.");
      router.refresh(); // updates the header badge and any open cart drawer
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Couldn't add this to your cart.");
      router.refresh(); // if the server capped the quantity, reflect that
    },
  });

  const [colorName, setColorName] = useState(colors[0]?.colorName ?? "");
  const sizesForColor = variants.filter((v) => v.colorName === colorName);
  // More than one *distinct* size, not just "some size is set" — every
  // variant in this catalog carries a size value (seed.ts defaults to
  // "One Size"), so a plain truthiness check would show a size picker
  // with exactly one option to pick, on every product.
  const hasSizes = new Set(sizesForColor.map((v) => v.size).filter(Boolean)).size > 1;
  const [size, setSize] = useState<string | null>(
    hasSizes ? (sizesForColor[0]?.size ?? null) : null,
  );

  const selected =
    sizesForColor.find((v) => (hasSizes ? v.size === size : true)) ?? sizesForColor[0];

  const price = selected?.pricePaise ?? basePricePaise;
  const stock = selected?.stock ?? 0;
  const lowStock = selected ? stock > 0 && stock <= selected.lowStockThreshold : false;

  function handleColorChange(next: string) {
    setColorName(next);
    const nextSizes = variants.filter((v) => v.colorName === next);
    setSize(nextSizes.find((v) => v.size)?.size ?? null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold">{formatINR(price)}</span>
        {compareAtPaise && (
          <span className="text-muted-foreground text-base line-through">
            {formatINR(compareAtPaise)}
          </span>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          Color: <span className="text-muted-foreground font-normal">{colorName}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {colors.map((variant) => (
            <button
              key={variant.colorName}
              type="button"
              onClick={() => handleColorChange(variant.colorName)}
              title={variant.colorName}
              className={`h-9 w-9 rounded-full border-2 transition-colors ${
                colorName === variant.colorName ? "border-primary" : "border-transparent"
              }`}
            >
              <span
                className="border-border block h-full w-full rounded-full border"
                style={{ backgroundColor: variant.colorHex }}
              />
            </button>
          ))}
        </div>
      </div>

      {hasSizes && (
        <div>
          <p className="mb-2 text-sm font-medium">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => setSize(v.size)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  size === v.size
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border"
                } ${v.stock === 0 ? "text-muted-foreground cursor-not-allowed line-through" : ""}`}
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm">
        {stock === 0 ? (
          <span className="text-destructive">Out of stock</span>
        ) : lowStock ? (
          <span className="text-amber-600">Only {stock} left</span>
        ) : (
          <span className="text-green-700">In stock</span>
        )}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={stock === 0 || !selected || addAction.isExecuting}
        onClick={() =>
          selected && addAction.execute({ variantId: selected.id, quantity: 1 })
        }
      >
        {stock === 0 ? "Out of stock" : addAction.isExecuting ? "Adding…" : "Add to cart"}
      </Button>
    </div>
  );
}
