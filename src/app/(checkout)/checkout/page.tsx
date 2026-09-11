import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";

export const metadata: Metadata = { title: "Checkout" };

function EmptyState({ message, cta, href }: { message: string; cta: string; href: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded border border-dashed border-[#d0c4c4] bg-[#fdfbf7] py-24 text-center">
      <ShoppingBag className="h-8 w-8 text-[#79564f]" />
      <p className="text-sm text-[#4d4545]">{message}</p>
      <Button asChild className="rounded-full bg-[#090707] hover:bg-[#221f1f]">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

async function CheckoutContent() {
  const [cart, sessionUser] = await Promise.all([getCart(), getCurrentUser()]);

  if (cart.lines.length === 0) {
    return <EmptyState message="Your bag is empty." cta="Continue shopping" href="/shop" />;
  }

  if (cart.hasIssues) {
    return (
      <EmptyState
        message="Some items in your bag changed — please review before checking out."
        cta="Review bag"
        href="/cart"
      />
    );
  }

  const [user, savedAddresses, settings] = await Promise.all([
    sessionUser
      ? prisma.user.findUnique({ where: { id: sessionUser.id }, select: { email: true } })
      : null,
    sessionUser
      ? prisma.address.findMany({
          where: { userId: sessionUser.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    getSettings(),
  ]);

  return (
    <CheckoutForm
      lines={cart.lines}
      subtotalPaise={cart.subtotalPaise}
      savedAddresses={savedAddresses}
      defaultEmail={user?.email}
      razorpayKeyId={env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
      shippingFlatPaise={settings.shippingFlatPaise}
      freeShippingThresholdPaise={settings.freeShippingThresholdPaise}
      supportEmail={settings.supportEmail}
    />
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="space-y-6 lg:col-span-7">
        <Skeleton className="h-48 w-full rounded" />
        <Skeleton className="h-64 w-full rounded" />
        <Skeleton className="h-40 w-full rounded" />
      </div>
      <Skeleton className="h-96 w-full rounded lg:col-span-5" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <div className="border-b border-[#d0c4c4]/30 bg-[#f7f3ee] py-3">
        <div className="mx-auto max-w-310 px-4 sm:px-6 lg:px-8">
          <nav className="font-jakarta flex items-center gap-2 text-[13px]">
            <Link href="/cart" className="text-[#4d4545]/80 hover:text-[#090707]">
              Bag
            </Link>
            <span className="text-xs text-[#7f7575]">›</span>
            <span className="font-semibold text-[#090707]">Details &amp; Payment</span>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-310 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </>
  );
}
