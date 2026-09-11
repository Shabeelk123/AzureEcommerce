import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping & Returns" };

export default async function ShippingReturnsPage() {
  const settings = await getSettings();

  return (
    <div className="font-jakarta mx-auto max-w-3xl px-5 py-12 md:px-10 lg:px-16 lg:py-16">
      <h1 className="font-playfair mb-2 text-3xl text-[#090707]">Shipping &amp; Returns</h1>
      <p className="mb-8 text-sm text-[#4d4545]">Last updated: [date]</p>

      <div className="space-y-6 text-sm leading-relaxed text-[#1c1c19]">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Shipping</h2>
          <p>
            Standard shipping is {formatINR(settings.shippingFlatPaise)}, and free on orders
            over {formatINR(settings.freeShippingThresholdPaise)}. Orders are dispatched
            within 1–2 business days and typically arrive within 3–7 business days depending
            on your location. You&apos;ll receive a tracking number by email once your order
            ships.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Cash on Delivery</h2>
          <p>
            Where Cash on Delivery is offered at checkout, payment is collected in cash by the
            courier at the time of delivery. Please have the exact amount ready.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Returns &amp; exchanges</h2>
          <p>
            If something isn&apos;t right — the wrong item, a damaged piece, or a shade that
            didn&apos;t work out — contact us within 7 days of delivery at{" "}
            <a href={`mailto:${settings.supportEmail}`} className="underline">
              {settings.supportEmail}
            </a>{" "}
            and we&apos;ll arrange a return or exchange. Items must be unworn, unwashed, and
            in their original packaging.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Refunds</h2>
          <p>
            Once a return is received and inspected, refunds are issued to your original
            payment method and typically reflect within 5–7 business days, depending on your
            bank. Cash on Delivery orders are refunded via bank transfer or UPI.
          </p>
        </section>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
          Template text — confirm actual dispatch/delivery timelines with your courier
          partner and have this reviewed before going live.
        </p>
      </div>
    </div>
  );
}
