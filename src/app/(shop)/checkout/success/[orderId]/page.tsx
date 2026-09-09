import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrderById } from "@/lib/order";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Order confirmed" };

// This route has no generateStaticParams (order ids are created at
// runtime, never known at build time), so its shell has to work for any
// future param value — the shared SiteHeader's cart drawer reads
// usePathname() (see cart-sheet.tsx), a client hook that can't resolve
// against an unknown pathname during that kind of prerender. Opting this
// one segment out of instant-navigation validation is more surgical than
// restructuring the globally-shared header to accommodate a single route;
// it does not affect navigation *between* other pages, which are still
// fully validated. See node_modules/next/dist/docs/.../instant-navigation.md.
export const instant = false;

type Props = { params: Promise<{ orderId: string }> };

async function OrderSummary({ params }: Props) {
  const [{ orderId }, user] = await Promise.all([params, getCurrentUser()]);
  const order = await getOrderById(orderId, user?.id ?? null);
  if (!order) notFound();

  const address = order.shippingAddress as {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };

  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <CheckCircle2 className="mb-3 h-10 w-10 text-green-600" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {order.status === "PAID" ? "Order confirmed" : "Order received"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Order {order.orderNumber} — a confirmation email is on its way to {order.email}.
        </p>
        {order.needsReview && (
          <p className="mt-2 max-w-md text-xs text-amber-600">
            One or more items in this order had limited stock at the time of payment. Our
            team will follow up if anything needs adjusting.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-lg border p-5">
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.productTitle} — {item.variantLabel} × {item.quantity}
              </span>
              <span>{formatINR(item.unitPricePaise * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatINR(order.subtotalPaise)}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatINR(order.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatINR(order.totalPaise)}</span>
          </div>
        </div>
        <div className="border-t pt-3 text-sm">
          <p className="font-medium">Shipping to</p>
          <p className="text-muted-foreground">
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.city}, {address.state} {address.pincode}
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function OrderSummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function CheckoutSuccessPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Suspense fallback={<OrderSummarySkeleton />}>
        <OrderSummary params={params} />
      </Suspense>
    </div>
  );
}
