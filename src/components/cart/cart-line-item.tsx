"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { removeCartItem, updateCartItemQuantity } from "@/actions/cart";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/lib/cart";

export function CartLineItem({ line }: { line: CartLine }) {
  const router = useRouter();

  const updateAction = useAction(updateCartItemQuantity, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update quantity."),
  });
  const removeAction = useAction(removeCartItem, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't remove item."),
  });

  const pending = updateAction.isExecuting || removeAction.isExecuting;

  function setQuantity(next: number) {
    if (next <= 0) {
      removeAction.execute({ cartItemId: line.id });
    } else {
      updateAction.execute({ cartItemId: line.id, quantity: next });
    }
  }

  return (
    <div className="flex gap-3 py-4">
      <Link
        href={`/product/${line.productSlug}`}
        className="bg-muted relative h-20 w-16 shrink-0 overflow-hidden rounded-md"
      >
        {line.imageUrl && (
          <Image
            src={line.imageUrl}
            alt={line.productTitle}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${line.productSlug}`}
              className="line-clamp-1 text-sm font-medium hover:underline"
            >
              {line.productTitle}
            </Link>
            <p className="text-muted-foreground text-xs">{line.variantLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => removeAction.execute({ cartItemId: line.id })}
            disabled={pending}
            aria-label="Remove item"
            className="text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {line.hasStockIssue && (
          <p className="mt-1 text-xs text-amber-600">
            Only {line.availableStock} left — quantity reduced.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-md border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pending || line.quantity <= 1}
              onClick={() => setQuantity(line.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm">{line.quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pending || line.quantity >= line.availableStock}
              onClick={() => setQuantity(line.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-sm font-medium">{formatINR(line.linePaise)}</span>
        </div>
      </div>
    </div>
  );
}
