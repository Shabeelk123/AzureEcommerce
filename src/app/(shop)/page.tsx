import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCollections, getNewArrivals } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AzureHijabs — Everyday & Premium Hijabs",
};

// No "use cache" and no Suspense needed at the page level: every data call
// this page makes (getCollections, getNewArrivals) is itself `"use cache"`
// in src/lib/catalog.ts, so the whole tree qualifies for the prerendered
// static shell on its own — home page loads are effectively free, served
// straight from the CDN/prerender cache.
export default async function HomePage() {
  const [featuredCollections, newArrivals] = await Promise.all([
    getCollections({ featuredOnly: true }),
    getNewArrivals(8),
  ]);

  return (
    <div>
      <section className="bg-muted/30 border-b">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Hijabs made for every day, and every occasion.
          </h1>
          <p className="text-muted-foreground max-w-lg">
            Jersey, chiffon, modal, and satin — thoughtfully cut fabrics designed to hold
            their shape, breathe through a full day, and drape the way you want them to.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">Shop the collection</Link>
          </Button>
        </div>
      </section>

      {featuredCollections.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">
            Shop by collection
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featuredCollections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className="group bg-muted relative flex h-56 items-end overflow-hidden rounded-lg p-6"
              >
                {collection.heroImage && (
                  <Image
                    src={collection.heroImage}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative text-lg font-medium text-white">
                  {collection.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">New arrivals</h2>
            <Link href="/shop" className="text-primary text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
