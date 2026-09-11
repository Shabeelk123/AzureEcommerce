import Link from "next/link";
import { cacheLife } from "next/cache";

// `new Date()` reads the system clock, which Cache Components treats the
// same as `Date.now()`/`Math.random()`: a value that would differ between
// builds and can't silently join the static shell. A copyright year only
// needs to be *roughly* current, so cache it explicitly with a long
// lifetime instead of forcing this whole footer behind a Suspense
// boundary for one number.
async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await getCurrentYear();
  return (
    <footer className="mt-auto w-full bg-[#f1ede8] text-[#1c1c19]">
      <div className="mx-auto grid max-w-360 grid-cols-2 gap-8 px-5 py-16 sm:grid-cols-3 md:px-10 lg:grid-cols-5 lg:px-16 lg:py-24">
        <div className="col-span-2 space-y-3 sm:col-span-1">
          <p className="font-playfair text-xl tracking-wide text-[#090707]">AzureHijabs</p>
          <p className="font-jakarta text-sm leading-relaxed text-[#4d4545]">
            Everyday and premium hijabs, designed for all-day comfort.
          </p>
        </div>
        <div className="space-y-3">
          <p className="font-jakarta text-[13px] font-semibold tracking-wider text-[#090707] uppercase">
            Shop
          </p>
          <ul className="font-jakarta space-y-2 text-sm text-[#4d4545]">
            <li>
              <Link href="/shop" className="transition-colors hover:text-[#090707]">
                All products
              </Link>
            </li>
            <li>
              <Link href="/search" className="transition-colors hover:text-[#090707]">
                Search
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="font-jakarta text-[13px] font-semibold tracking-wider text-[#090707] uppercase">
            Account
          </p>
          <ul className="font-jakarta space-y-2 text-sm text-[#4d4545]">
            <li>
              <Link href="/account" className="transition-colors hover:text-[#090707]">
                Your account
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="transition-colors hover:text-[#090707]">
                Order history
              </Link>
            </li>
            <li>
              <Link href="/account/addresses" className="transition-colors hover:text-[#090707]">
                Addresses
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="font-jakarta text-[13px] font-semibold tracking-wider text-[#090707] uppercase">
            Legal
          </p>
          <ul className="font-jakarta space-y-2 text-sm text-[#4d4545]">
            <li>
              <Link href="/shipping-returns" className="transition-colors hover:text-[#090707]">
                Shipping &amp; Returns
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="transition-colors hover:text-[#090707]">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-service" className="transition-colors hover:text-[#090707]">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="font-jakarta text-[13px] font-semibold tracking-wider text-[#090707] uppercase">
            Payments
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-jakarta rounded-full border border-[#d0c4c4] bg-[#fdf9f4] px-2.5 py-1 text-xs text-[#79564f]">
              Razorpay
            </span>
          </div>
        </div>
      </div>
      <div className="font-jakarta flex flex-col items-center justify-between gap-3 border-t border-[#d0c4c4]/60 px-5 py-6 text-center text-xs text-[#4d4545] sm:flex-row md:px-10 lg:px-16">
        <p>© {year} AzureHijabs. All rights reserved.</p>
        <p className="text-[#79564f]">Modest fashion, made comfortable.</p>
      </div>
    </footer>
  );
}
