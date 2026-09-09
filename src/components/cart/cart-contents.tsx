import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CheckoutButton } from "@/components/cart/checkout-button";

/**
 * Shared between the header's cart drawer and the full /cart page — one
 * source of truth for "what does the cart look like", styled slightly
 * differently by the `compact` flag (the drawer is narrower).
 */
export async function CartContents({ compact = false }: { compact?: boolean }) {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ShoppingBag className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">Your cart is empty.</p>
        <Button asChild size="sm">
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y">
        {cart.lines.map((line) => (
          <CartLineItem key={line.id} line={line} />
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        {cart.hasIssues && (
          <p className="text-xs text-amber-600">
            Some items had their quantity reduced due to limited stock.
          </p>
        )}
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Subtotal</span>
          <span>{formatINR(cart.subtotalPaise)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Shipping and any discounts are calculated at checkout.
        </p>
        {compact ? (
          <Button asChild className="w-full">
            <Link href="/cart">View cart</Link>
          </Button>
        ) : (
          <CheckoutButton />
        )}
      </div>
    </div>
  );
}
