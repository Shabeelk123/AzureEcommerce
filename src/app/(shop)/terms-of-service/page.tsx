import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsOfServicePage() {
  const settings = await getSettings();

  return (
    <div className="font-jakarta mx-auto max-w-3xl px-5 py-12 md:px-10 lg:px-16 lg:py-16">
      <h1 className="font-playfair mb-2 text-3xl text-[#090707]">Terms of Service</h1>
      <p className="mb-8 text-sm text-[#4d4545]">Last updated: [date]</p>

      <div className="space-y-6 text-sm leading-relaxed text-[#1c1c19]">
        <p>
          These terms govern your use of {settings.storeName} and any purchase made through
          it. By placing an order, you agree to them.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Orders &amp; pricing</h2>
          <p>
            All prices are listed in INR and are inclusive of applicable taxes unless stated
            otherwise. We reserve the right to correct pricing errors and to cancel an order
            placed at an incorrect price, with a full refund.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Payment</h2>
          <p>
            Payments are processed securely through Razorpay (cards, UPI, net banking,
            wallets) or Cash on Delivery, where offered. An order is confirmed once payment is
            captured, or immediately for Cash on Delivery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Cancellations</h2>
          <p>
            Orders can be cancelled before they&apos;re shipped by contacting us at{" "}
            <a href={`mailto:${settings.supportEmail}`} className="underline">
              {settings.supportEmail}
            </a>
            . A paid order that&apos;s cancelled before dispatch is refunded in full to the
            original payment method.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Accounts</h2>
          <p>
            You&apos;re responsible for keeping your account credentials confidential and for
            all activity under your account. Notify us immediately of any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Limitation of liability</h2>
          <p>
            We aren&apos;t liable for indirect or consequential losses arising from use of the
            site, to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Governing law</h2>
          <p>These terms are governed by the laws of India. [Jurisdiction city/state].</p>
        </section>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
          Template text — replace the placeholders above and have this reviewed by counsel
          before going live. In particular, confirm your registered business name, address,
          and jurisdiction here.
        </p>
      </div>
    </div>
  );
}
