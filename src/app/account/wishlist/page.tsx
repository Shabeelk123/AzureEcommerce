import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWishlistForUser } from "@/lib/wishlist";
import { DesignProductCard } from "@/components/shop/design-product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Your wishlist" };

async function WishlistGrid() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getWishlistForUser(user.id);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground mb-4 text-sm">
          Nothing saved yet — tap the heart on any product to keep it here.
        </p>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {items.map((item, index) => (
        <DesignProductCard
          key={item.id}
          product={item.product}
          photoIndex={index}
          wishlisted
        />
      ))}
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="aspect-3/4 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Your wishlist</h1>
      <Suspense fallback={<WishlistSkeleton />}>
        <WishlistGrid />
      </Suspense>
    </div>
  );
}
