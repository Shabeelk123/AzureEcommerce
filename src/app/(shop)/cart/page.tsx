import type { Metadata } from "next";
import { Suspense } from "react";
import { CartContents } from "@/components/cart/cart-contents";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Your cart" };

function CartPageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-20 w-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your cart</h1>
      <Suspense fallback={<CartPageSkeleton />}>
        <CartContents />
      </Suspense>
    </div>
  );
}
