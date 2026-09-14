import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import { getCategories, getNewArrivals, type ProductCard } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWishlistProductIds } from "@/lib/wishlist";
import { DesignProductCard } from "@/components/shop/design-product-card";
import { Button } from "@/components/ui/button";
import {
  DESIGN_HERO_PHOTO,
  DESIGN_STILL_LIFE_PHOTO,
  designProductPhoto,
} from "@/lib/design-placeholder-images";

export const metadata: Metadata = {
  title: "AzureHijabs — Everyday & Premium Hijabs",
};

// Wishlist state is per-viewer and reads cookies (via getCurrentUser), so
// it can't join the static shell the rest of the homepage sits in — kept
// to its own small Suspense boundary (see the "FEATURED PRODUCTS" section
// below) rather than making the whole page dynamic for one heart icon's
// initial state, the same pattern the header uses for its cart/wishlist
// badges.
async function FeaturedProductsGrid({ products }: { products: ProductCard[] }) {
  const user = await getCurrentUser();
  const wishlistedIds = user ? await getWishlistProductIds(user.id) : new Set<string>();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {products.map((product, index) => (
        <DesignProductCard
          key={product.id}
          product={product}
          photoIndex={index}
          wishlisted={wishlistedIds.has(product.id)}
        />
      ))}
    </div>
  );
}

// No "use cache" and no Suspense needed at the page level: every data call
// this page makes (getCategories, getCollections, getNewArrivals) is itself
// `"use cache"` in src/lib/catalog.ts, so the whole tree qualifies for the
// prerendered static shell on its own — home page loads are effectively
// free, served straight from the CDN/prerender cache.
export default async function HomePage() {
  const [categories, newArrivals] = await Promise.all([
    getCategories(),
    getNewArrivals(8),
  ]);

  const heroProduct = newArrivals[0];

  return (
    <div className="font-jakarta flex flex-col">
      {/* HERO */}
      <section className="relative w-full overflow-hidden bg-[#f7f3ee]">
        <div className="mx-auto max-w-360 px-5 py-14 md:px-10 md:py-20 lg:px-16 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="z-10 flex flex-col justify-center gap-6 lg:col-span-6 lg:pr-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f1ede8] px-3 py-1 text-[#79564f]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold tracking-widest uppercase">
                  Thoughtfully Made
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="font-playfair text-[38px] leading-[1.15] tracking-tight text-[#090707] md:text-[56px] md:leading-[1.14]">
                  Elegance in <span className="text-[#79564f] italic">Every Wrap</span>
                </h1>
                <p className="max-w-xl pt-2 text-base leading-relaxed text-[#4d4545]">
                  Jersey, chiffon, modal, and satin — thoughtfully cut fabrics designed to
                  hold their shape, breathe through a full day, and drape the way you want
                  them to.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#090707] px-8 text-white hover:bg-[#221f1f]"
                >
                  <Link href="/shop">
                    Shop Now
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-[#221f1f]/20 bg-[#fdf9f4] px-8 text-[#090707] hover:bg-[#f1ede8]"
                >
                  <Link href="#categories">Explore Collection</Link>
                </Button>
              </div>
            </div>

            <div className="relative lg:col-span-6">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#e6e2dd] shadow-xl">
                <Image
                  src={DESIGN_HERO_PHOTO}
                  alt="Editorial portrait of a woman in a draped hijab"
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#221f1f]/30 via-transparent to-transparent" />
                {heroProduct && (
                  <div className="absolute right-5 bottom-5 left-5 flex items-center justify-between rounded-xl bg-[#fdf9f4]/90 p-4 shadow-lg backdrop-blur-md">
                    <div>
                      <span className="block text-[11px] tracking-widest text-[#79564f] uppercase">
                        {heroProduct.fabric}
                      </span>
                      <p className="text-[15px] font-semibold text-[#090707]">
                        {heroProduct.title}
                      </p>
                    </div>
                    <Link
                      href={`/product/${heroProduct.slug}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#090707] text-white transition-colors hover:bg-[#79564f]"
                      aria-label={`View ${heroProduct.title}`}
                    >
                      <ArrowUpRight className="h-5 w-5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="w-full bg-[#fdf9f4] py-16 lg:py-24" id="categories">
          <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
            <div className="mb-10 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-widest text-[#79564f] uppercase">
                  Shop by Fabric
                </span>
                <h2 className="font-playfair text-3xl text-[#090707] md:text-[40px]">
                  Curated Textures
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#4d4545]">
                Each collection is organized by fabric, so you can shop for the drape and
                feel you want.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 4).map((category, index) => (
                <Link
                  key={category.id}
                  href={`/shop/${category.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl bg-[#f7f3ee] p-3 shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#f1ede8]">
                    <Image
                      src={designProductPhoto(index)}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between pt-4">
                    <div>
                      <h3 className="font-playfair text-xl text-[#090707] transition-colors group-hover:text-[#79564f]">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="mt-1 line-clamp-2 text-[13px] text-[#4d4545]">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center text-sm font-semibold text-[#090707] transition-transform group-hover:translate-x-1">
                      <span>View Styles</span>
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      {newArrivals.length > 0 && (
        <section className="w-full bg-[#f7f3ee] py-16 lg:py-24">
          <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
            <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-widest text-[#79564f] uppercase">
                  Handpicked Essentials
                </span>
                <h2 className="font-playfair text-3xl text-[#090707] md:text-[40px]">
                  New Arrivals
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-sm font-semibold text-[#090707] underline decoration-[#79564f] decoration-1 underline-offset-4"
              >
                View all
              </Link>
            </div>
            <Suspense
              fallback={
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
                  {newArrivals.map((product, index) => (
                    <DesignProductCard key={product.id} product={product} photoIndex={index} />
                  ))}
                </div>
              }
            >
              <FeaturedProductsGrid products={newArrivals} />
            </Suspense>
          </div>
        </section>
      )}

      {/* BRAND PHILOSOPHY */}
      <section className="w-full bg-[#fdf9f4] py-16 lg:py-24">
        <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex w-fit items-center rounded-full bg-[#f1ede8] px-3 py-1 text-[11px] font-semibold tracking-widest text-[#79564f] uppercase">
                Our Modest Philosophy
              </div>
              <blockquote className="font-playfair text-2xl leading-snug text-[#090707] md:text-[32px]">
                &ldquo;Modest fashion shouldn&rsquo;t compromise on touch, breathability, or
                effortless style.&rdquo;
              </blockquote>
              <p className="max-w-xl text-base leading-relaxed text-[#4d4545]">
                Every fabric is chosen to stay comfortable and secure through a full day —
                jersey that stretches with you, georgette that drapes without slipping,
                and modal-blends that breathe. Less adjusting, more getting on with your
                day.
              </p>
            </div>
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#e6e2dd] shadow-xl">
                <Image
                  src={DESIGN_STILL_LIFE_PHOTO}
                  alt="Rolled and folded hijabs in earth tones"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SHOP WITH US */}
      <section className="w-full bg-[#f7f3ee] py-16 lg:py-20">
        <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
          <div className="mx-auto mb-12 max-w-xl space-y-1 text-center">
            <span className="text-[11px] font-semibold tracking-widest text-[#79564f] uppercase">
              The AzureHijabs Standard
            </span>
            <h2 className="font-playfair text-2xl text-[#090707] md:text-[28px]">
              Why Women Choose Us
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-start rounded-xl bg-[#fdfbf7] p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1ede8] text-[#79564f]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#090707]">Premium Fabrics</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Jersey, chiffon, modal, and satin, chosen for softness, breathability, and
                lasting drape.
              </p>
            </div>
            <div className="flex flex-col items-start rounded-xl bg-[#fdfbf7] p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1ede8] text-[#79564f]">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#090707]">Fast Dispatch</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Orders are packed and shipped promptly, with tracking on every order.
              </p>
            </div>
            <div className="flex flex-col items-start rounded-xl bg-[#fdfbf7] p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1ede8] text-[#79564f]">
                <ChevronRight className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#090707]">Secure Payments</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#4d4545]">
                Checkout securely with Razorpay — cards, UPI, and net banking supported.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
