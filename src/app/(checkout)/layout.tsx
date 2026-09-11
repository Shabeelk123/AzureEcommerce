import type { ReactNode } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowLeft, Lock } from "lucide-react";
import { playfairDisplay, plusJakartaSans } from "@/lib/fonts";

// `new Date()` reads the system clock, which Cache Components treats the
// same as `Date.now()`/`Math.random()`: a value that would differ between
// builds and can't silently join the static shell. Same fix as
// src/components/shop/site-footer.tsx's getCurrentYear — cache it
// explicitly instead of forcing this whole layout behind a Suspense
// boundary for one number.
async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

// Deliberately does NOT use the shared shop (SiteHeader/SiteFooter) chrome
// — a focused checkout suppresses full-site nav, promo bar, and search so
// there's nothing to click away to mid-purchase. Same URLs as before
// (route groups don't affect the URL), just its own minimal layout.
export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const year = await getCurrentYear();
  return (
    <div
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} font-jakarta flex min-h-screen flex-col bg-[#fdf9f4]`}
    >
      <header className="sticky top-0 z-40 border-b border-[#d0c4c4]/40 bg-[#fdfbf7]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-310 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4d4545] transition-colors hover:text-[#090707]"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Return to Bag
          </Link>
          <Link href="/" className="font-playfair text-lg font-semibold text-[#090707]">
            AzureHijabs
          </Link>
          <div className="flex items-center gap-2 text-sm text-[#4d4545]">
            <Lock className="h-4 w-4 text-[#79564f]" />
            <span className="hidden sm:inline">SSL Encrypted Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-[#d0c4c4]/30 bg-[#f7f3ee] py-8">
        <div className="mx-auto flex max-w-310 flex-col items-center gap-3 px-4 text-center text-xs text-[#4d4545] sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} AzureHijabs. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
            <Link href="/shipping-returns" className="hover:underline">
              Shipping &amp; Returns
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
