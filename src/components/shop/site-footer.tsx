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
    <footer className="bg-muted/30 mt-24 border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-semibold tracking-tight">AzureHijabs</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Everyday and premium hijabs, designed for all-day comfort.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Shop</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>
              <Link href="/shop" className="hover:text-foreground">
                All products
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-foreground">
                Search
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Account</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>
              <Link href="/account" className="hover:text-foreground">
                Your account
              </Link>
            </li>
            <li>
              <Link href="/account/addresses" className="hover:text-foreground">
                Addresses
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Support</p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li className="text-muted-foreground/70">Shipping &amp; returns</li>
            <li className="text-muted-foreground/70">Size guide</li>
          </ul>
        </div>
      </div>
      <div className="text-muted-foreground border-t px-4 py-6 text-center text-xs">
        © {year} AzureHijabs. All rights reserved.
      </div>
    </footer>
  );
}
