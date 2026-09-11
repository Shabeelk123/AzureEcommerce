import Link from "next/link";
import { Suspense } from "react";
import { Menu, Search, User } from "lucide-react";
import { getCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { CartSheet, CartContentsSkeleton } from "@/components/cart/cart-sheet";
import { CartBadge, CartBadgeFallback } from "@/components/cart/cart-badge";
import { CartContents } from "@/components/cart/cart-contents";
import { WishlistBadge, WishlistBadgeFallback } from "@/components/shop/wishlist-badge";

async function PromoBar() {
  const settings = await getSettings();
  return (
    <div className="bg-[#f1ede8] px-4 py-1.5 text-center font-jakarta text-[11px] font-semibold tracking-widest text-[#4d4545] uppercase">
      Complimentary shipping on orders over {formatINR(settings.freeShippingThresholdPaise)}
    </div>
  );
}

async function NavLinks({ className }: { className?: string }) {
  const categories = await getCategories();
  return (
    <nav className={className}>
      <Link
        href="/"
        className="font-medium text-[#090707] underline decoration-[#79564f] decoration-1 underline-offset-8"
      >
        Home
      </Link>
      <Link
        href="/shop"
        className="text-[#4d4545] transition-colors duration-200 hover:text-[#090707]"
      >
        Shop
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/shop/${category.slug}`}
          className="text-[#4d4545] transition-colors duration-200 hover:text-[#090707]"
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}

function SearchForm() {
  return (
    <form action="/search" className="relative hidden w-48 lg:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4.5 w-4.5 -translate-y-1/2 text-[#4d4545]" />
      <Input
        name="q"
        placeholder="Search drapes, silks…"
        aria-label="Search products"
        className="rounded-full border-none bg-[#f7f3ee] pl-8 text-[#1c1c19] placeholder:text-[#4d4545] focus-visible:ring-[#9e7770]"
      />
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#fdf9f4]/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <Suspense fallback={null}>
        <PromoBar />
      </Suspense>
      <div className="mx-auto flex h-20 max-w-360 items-center gap-4 px-5 md:px-10 lg:px-16">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
            <Suspense fallback={null}>
              <NavLinks className="flex flex-col gap-4 px-4 py-6 font-jakarta text-sm" />
            </Suspense>
          </SheetContent>
        </Sheet>

        <Link href="/" className="whitespace-nowrap">
          <span className="font-playfair text-2xl tracking-wide text-[#090707]">
            AzureHijabs
          </span>
        </Link>

        <Suspense fallback={null}>
          <NavLinks className="hidden items-center gap-8 font-jakarta text-sm md:flex" />
        </Suspense>

        <div className="ml-auto flex items-center gap-2 lg:gap-4">
          <SearchForm />
          <Suspense fallback={<WishlistBadgeFallback />}>
            <WishlistBadge />
          </Suspense>
          <Button variant="ghost" size="icon" asChild className="text-[#4d4545] hover:text-[#090707]">
            <Link href="/account" aria-label="Your account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <CartSheet
            trigger={
              <Suspense fallback={<CartBadgeFallback />}>
                <CartBadge />
              </Suspense>
            }
          >
            <Suspense fallback={<CartContentsSkeleton />}>
              <CartContents compact />
            </Suspense>
          </CartSheet>
        </div>
      </div>
    </header>
  );
}
