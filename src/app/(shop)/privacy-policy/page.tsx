import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();

  return (
    <div className="font-jakarta mx-auto max-w-3xl px-5 py-12 md:px-10 lg:px-16 lg:py-16">
      <h1 className="font-playfair mb-2 text-3xl text-[#090707]">Privacy Policy</h1>
      <p className="mb-8 text-sm text-[#4d4545]">Last updated: [date]</p>

      <div className="space-y-6 text-sm leading-relaxed text-[#1c1c19]">
        <p>
          {settings.storeName} (&quot;we&quot;, &quot;us&quot;) operates this website. This
          policy explains what personal data we collect, why, and how you can control it.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Information we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account details you provide: name, email, phone number, password (stored as a salted hash, never in plain text).</li>
            <li>Order and shipping details: delivery address, phone number, items purchased.</li>
            <li>Payment information: processed directly by Razorpay — we never see or store your card, UPI, or bank details.</li>
            <li>Basic usage data (pages visited, device/browser type) for security and troubleshooting.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">How we use it</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To process and deliver your orders, and contact you about them.</li>
            <li>To maintain your account, including saved addresses and order history.</li>
            <li>To send transactional emails (order confirmation, shipping updates) — never marketing email without your consent.</li>
            <li>To detect and prevent fraud or abuse of the site.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Sharing</h2>
          <p>
            We share data only with the service providers needed to run the store: Razorpay
            (payments), our shipping/courier partner, and our email delivery provider. We do
            not sell your personal data to anyone.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Your rights</h2>
          <p>
            You can access, correct, or request deletion of your account data at any time from
            your account settings, or by emailing{" "}
            <a href={`mailto:${settings.supportEmail}`} className="underline">
              {settings.supportEmail}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#090707]">Contact</h2>
          <p>
            Questions about this policy: {settings.supportEmail}
            {settings.supportPhone ? ` or ${settings.supportPhone}` : ""}.
          </p>
        </section>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
          Template text — replace the placeholders above and have this reviewed by counsel
          familiar with Indian data-protection law (the DPDP Act) before going live.
        </p>
      </div>
    </div>
  );
}
