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
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1ede8] text-[#79564f]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-playfair text-3xl text-[#090707]">
          {order.status === "PAID" ? "Order confirmed" : "Order received"}
        </h1>
        <p className="font-jakarta mt-2 text-sm text-[#4d4545]">
          Order <span className="font-semibold text-[#090707]">{order.orderNumber}</span> — a
          confirmation email is on its way to {order.email}.
        </p>
        {order.needsReview && (
          <p className="font-jakarta mt-3 max-w-md rounded-full bg-amber-50 px-4 py-1.5 text-xs text-amber-700">
            One or more items in this order had limited stock at the time of payment. Our
            team will follow up if anything needs adjusting.
          </p>
        )}
        {order.paymentMethod === "COD" && (
          <p className="font-jakarta mt-3 max-w-md rounded-full bg-[#f1ede8] px-4 py-1.5 text-xs text-[#79564f]">
            Cash on Delivery — please keep {formatINR(order.totalPaise)} ready for the courier.
          </p>
        )}
      </div>

      <div className="rounded border border-[#d0c4c4]/50 bg-[#fdfbf7] p-6 shadow-xs">
        <ul className="font-jakarta divide-y divide-[#d0c4c4]/40">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2.5 text-sm">
              <span className="text-[#4d4545]">
                {item.productTitle} — {item.variantLabel} × {item.quantity}
              </span>
              <span className="font-medium text-[#090707]">
                {formatINR(item.unitPricePaise * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="font-jakarta mt-3 space-y-1.5 border-t border-[#d0c4c4]/40 pt-4 text-sm">
          <div className="flex justify-between text-[#4d4545]">
            <span>Subtotal</span>
            <span>{formatINR(order.subtotalPaise)}</span>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-[#79564f]">
              <span>Discount</span>
              <span>-{formatINR(order.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between text-[#4d4545]">
            <span>Shipping</span>
            <span>
              {order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#d0c4c4]/40 pt-3 text-base font-semibold text-[#090707]">
            <span>Total</span>
            <span>{formatINR(order.totalPaise)}</span>
          </div>
        </div>
        <div className="font-jakarta mt-4 border-t border-[#d0c4c4]/40 pt-4 text-sm">
          <p className="font-medium text-[#090707]">Shipping to</p>
          <p className="mt-1 text-[#4d4545]">
            {address.fullName}
            <br />
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.city}, {address.state} {address.pincode}
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button asChild className="rounded-full bg-[#090707] px-8 hover:bg-[#221f1f]">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function OrderSummarySkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Skeleton className="mx-auto h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function CheckoutSuccessPage({ params }: Props) {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Suspense fallback={<OrderSummarySkeleton />}>
        <OrderSummary params={params} />
      </Suspense>
    </div>
  );
}
