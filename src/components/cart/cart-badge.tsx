import { ShoppingBag } from "lucide-react";
import { getCartItemCount } from "@/lib/cart";

// A separate, lighter-weight query from the full cart contents (see
// cart-contents.tsx) — the header badge shouldn't wait on the join across
// variant/product/image just to show a number.
export async function CartBadge() {
  const count = await getCartItemCount();
  return (
    <span className="relative">
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

export function CartBadgeFallback() {
  return <ShoppingBag className="h-5 w-5" />;
}
