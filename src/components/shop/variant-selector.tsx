"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { addToCart } from "@/actions/cart";
import { formatINR } from "@/lib/money";

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

  const [quantity, setQuantity] = useState(1);
  // useAction's execute() takes only the input — no per-call callback
  // override — so "Buy Now" (add, then go straight to checkout) is
  // threaded through this ref and read back inside the one onSuccess
  // defined at hook creation, rather than passed at the call site.
  const navigateToCheckout = useRef(false);

  const addAction = useAction(addToCart, {
    onSuccess: () => {
      if (navigateToCheckout.current) {
        navigateToCheckout.current = false;
        router.push("/checkout");
        return;
      }
      toast.success("Added to your bag.");
      router.refresh(); // updates the header badge and any open cart drawer
    },
    onError: ({ error }) => {
      navigateToCheckout.current = false;
      toast.error(error.serverError ?? "Couldn't add this to your bag.");
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
  const percentOff =
    compareAtPaise && compareAtPaise > price
      ? Math.round(((compareAtPaise - price) / compareAtPaise) * 100)
      : null;

  function handleColorChange(next: string) {
    setColorName(next);
    const nextSizes = variants.filter((v) => v.colorName === next);
    setSize(nextSizes.find((v) => v.size)?.size ?? null);
  }

  function addToBag(then?: "checkout") {
    if (!selected) return;
    navigateToCheckout.current = then === "checkout";
    addAction.execute({ variantId: selected.id, quantity });
  }

  return (
    <div className="space-y-space-lg">
      <div className="rounded-xl bg-[#f7f3ee] p-4 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="font-jakarta text-[26px] font-bold text-[#090707]">
            {formatINR(price)}
          </span>
          {compareAtPaise && compareAtPaise > price && (
            <span className="font-jakarta text-sm text-[#4d4545] line-through">
              {formatINR(compareAtPaise)}
            </span>
          )}
          {percentOff && (
            <span className="font-jakarta rounded-full bg-[#fecfc7]/50 px-2 py-0.5 text-[11px] font-semibold text-[#79564f] uppercase">
              {percentOff}% off
            </span>
          )}
        </div>
        <p className="font-jakarta mt-0.5 text-xs text-[#4d4545]">
          Inclusive of all taxes &amp; duties
        </p>
      </div>

      {colors.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[15px] font-semibold text-[#090707]">
              Color: <span className="font-normal text-[#4d4545]">{colorName}</span>
            </span>
            <span className="font-jakarta text-[11px] font-semibold tracking-wide text-[#79564f] uppercase">
              {colors.length} Shades
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {colors.map((variant) => (
              <button
                key={variant.colorName}
                type="button"
                onClick={() => handleColorChange(variant.colorName)}
                title={variant.colorName}
                className={`h-9 w-9 rounded-full p-0.5 shadow-sm ring-2 ring-offset-2 ring-offset-[#fdf9f4] transition-transform active:scale-95 ${
                  colorName === variant.colorName ? "ring-[#090707]" : "ring-[#d0c4c4]"
                }`}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{ backgroundColor: variant.colorHex }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSizes && (
        <div className="space-y-2">
          <span className="font-jakarta text-[15px] font-semibold text-[#090707]">Size</span>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => setSize(v.size)}
                className={`font-jakarta rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  size === v.size
                    ? "border-[#090707] bg-[#090707] text-white"
                    : "border-[#d0c4c4] text-[#1c1c19] hover:border-[#090707]"
                } ${v.stock === 0 ? "cursor-not-allowed text-[#4d4545] line-through opacity-50" : ""}`}
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="font-jakarta text-sm p-2.5">
        {stock === 0 ? (
          <span className="font-medium text-red-600">Out of stock</span>
        ) : lowStock ? (
          <span className="font-medium text-amber-700">Only {stock} left</span>
        ) : (
          <span className="rounded-full bg-[#f1ede8] px-2.5 py-0.5 text-[#79564f]">
            In Stock
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full bg-[#f7f3ee] p-1 shadow-sm">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#1c1c19] transition-colors hover:bg-[#ebe8e3]"
            >
              <Minus className="h-4.5 w-4.5" />
            </button>
            <span className="font-jakarta w-10 text-center text-lg font-semibold text-[#090707]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#1c1c19] transition-colors hover:bg-[#ebe8e3]"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>

          <button
            type="button"
            disabled={stock === 0 || !selected || addAction.isExecuting}
            onClick={() => addToBag()}
            className="font-jakarta flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#090707] text-sm font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:bg-[#221f1f] disabled:opacity-50"
          >
            <ShoppingBag className="h-5 w-5" />
            {stock === 0 ? "Out of stock" : addAction.isExecuting ? "Adding…" : "Add to Cart"}
          </button>
        </div>

        <button
          type="button"
          disabled={stock === 0 || !selected || addAction.isExecuting}
          onClick={() => addToBag("checkout")}
          className="font-jakarta flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f1ede8] text-sm font-semibold tracking-wide text-[#090707] uppercase shadow-sm transition-all hover:bg-[#79564f] hover:text-white disabled:opacity-50"
        >
          <Zap className="h-4.5 w-4.5" />
          Buy Now • Fast Checkout
        </button>
      </div>
    </div>
  );
}
