import Link from "next/link";
import { Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWishlistCount } from "@/lib/wishlist";

// Mirrors src/components/cart/cart-badge.tsx's shape — a separate,
// lighter-weight query just for the header count, not the full wishlist.
export async function WishlistBadge() {
  const user = await getCurrentUser();
  const count = user ? await getWishlistCount(user.id) : 0;

  return (
    <Link
      href={user ? "/account/wishlist" : "/login"}
      aria-label="Your wishlist"
      className="relative flex items-center justify-center text-[#4d4545] transition-colors hover:text-[#090707]"
    >
      <Heart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#79564f] px-1 font-jakarta text-[10px] font-medium text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function WishlistBadgeFallback() {
  return <Heart className="h-5 w-5 text-[#4d4545]" />;
}
