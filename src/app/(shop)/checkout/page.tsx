import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";

export const metadata: Metadata = { title: "Checkout" };

async function CheckoutContent() {
  const [cart, sessionUser] = await Promise.all([getCart(), getCurrentUser()]);

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-24 text-center">
        <p className="text-muted-foreground mb-4 text-sm">Your cart is empty.</p>
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  if (cart.hasIssues) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 py-16 text-center">
        <p className="mb-4 text-sm text-amber-800">
          Some items in your cart changed. Please review your cart before checking out.
        </p>
        <Button asChild variant="outline">
          <Link href="/cart">Review cart</Link>
        </Button>
      </div>
    );
  }

  const [user, savedAddresses] = await Promise.all([
    sessionUser
      ? prisma.user.findUnique({ where: { id: sessionUser.id }, select: { email: true } })
      : null,
    sessionUser
      ? prisma.address.findMany({
          where: { userId: sessionUser.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <CheckoutForm
      lines={cart.lines}
      subtotalPaise={cart.subtotalPaise}
      savedAddresses={savedAddresses}
      defaultEmail={user?.email}
      razorpayKeyId={env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
    />
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
