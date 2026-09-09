import Link from "next/link";
import { Suspense } from "react";
import { Menu, Search, User } from "lucide-react";
import { getCategories } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { CartSheet, CartContentsSkeleton } from "@/components/cart/cart-sheet";
import { CartBadge, CartBadgeFallback } from "@/components/cart/cart-badge";
import { CartContents } from "@/components/cart/cart-contents";

async function NavLinks({ className }: { className?: string }) {
  const categories = await getCategories();
  return (
    <nav className={className}>
      <Link
        href="/shop"
        className="text-foreground/80 hover:text-foreground text-sm font-medium"
      >
        Shop all
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/shop/${category.slug}`}
          className="text-foreground/80 hover:text-foreground text-sm font-medium"
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}

function SearchForm() {
  return (
    <form action="/search" className="relative hidden w-full max-w-xs sm:block">
      <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
      <Input
        name="q"
        placeholder="Search hijabs…"
        className="pl-8"
        aria-label="Search products"
      />
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
            <Suspense fallback={null}>
              <NavLinks className="flex flex-col gap-4 px-4 py-6" />
            </Suspense>
          </SheetContent>
        </Sheet>

        <Link href="/" className="text-lg font-semibold tracking-tight whitespace-nowrap">
          AzureHijabs
        </Link>

        <Suspense fallback={null}>
          <NavLinks className="hidden items-center gap-6 md:flex" />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          <SearchForm />
          <Button variant="ghost" size="icon" asChild>
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
