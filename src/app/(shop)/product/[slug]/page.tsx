import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight, Droplets, Info, ShieldCheck, Truck } from "lucide-react";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWishlistProductIds } from "@/lib/wishlist";
import { VariantSelector } from "@/components/shop/variant-selector";
import { ProductGallery } from "@/components/shop/product-gallery";
import { DesignProductCard } from "@/components/shop/design-product-card";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";

export async function generateStaticParams() {
  // Prerender every active product at build time — a modest catalog (a few
  // dozen to a few hundred SKUs) makes this cheap and gives every product
  // page a served-from-cache first load.
  const { products } = await getProducts({ page: 1 });
  return products.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const description = product.seoDescription ?? product.description.slice(0, 155);
  const image = product.images[0]?.url;

  return {
    title: product.seoTitle ?? product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

async function RelatedProducts({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: string;
}) {
  const [related, user] = await Promise.all([
    getRelatedProducts(productId, categoryId),
    getCurrentUser(),
  ]);
  if (related.length === 0) return null;
  const wishlistedIds = user ? await getWishlistProductIds(user.id) : new Set<string>();

  return (
    <section className="w-full bg-[#f7f3ee] py-16 lg:py-20">
      <div className="mx-auto max-w-360 px-5 md:px-10 lg:px-16">
        <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold tracking-widest text-[#79564f] uppercase">
              Curated Complementary Pieces
            </span>
            <h2 className="font-playfair text-3xl text-[#090707] md:text-[36px]">
              You May Also Like
            </h2>
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-1 text-sm font-semibold text-[#090707] underline decoration-[#79564f] decoration-1 underline-offset-4"
          >
            View All Drapes
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {related.map((product, index) => (
            <DesignProductCard
              key={product.id}
              product={product}
              photoIndex={index}
              wishlisted={wishlistedIds.has(product.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <div className="mx-auto max-w-360 px-5 py-16 md:px-10 lg:px-16">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// Its own tiny Suspense boundary (see the FeaturedProductsGrid comment in
// src/app/(shop)/page.tsx for the same rationale) — wishlist state reads
// cookies per-viewer, which would otherwise pull this whole product page
// out of the prerendered static shell for one heart icon's initial state.
async function ProductWishlistHeart({ productId }: { productId: string }) {
  const user = await getCurrentUser();
  const wishlisted = user
    ? (await getWishlistProductIds(user.id)).has(productId)
    : false;

  return (
    <WishlistButton
      productId={productId}
      initialWishlisted={wishlisted}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf9f4]/90 text-[#4d4545] shadow-sm backdrop-blur-sm transition-colors hover:text-[#79564f]"
    />
  );
}

function Accordion({
  icon,
  title,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group border-b border-[#ebe8e3] p-5 last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between select-none">
        <span className="font-jakarta flex items-center gap-2 text-[15px] font-semibold text-[#090707]">
          <span className="text-[#79564f]">{icon}</span>
          {title}
        </span>
        <ChevronRight className="h-4 w-4 text-[#4d4545] transition-transform duration-300 group-open:rotate-90" />
      </summary>
      <div className="font-jakarta pt-3 text-sm leading-relaxed text-[#4d4545]">
        {children}
      </div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const inStock = product.variants.some((v) => v.stock > 0);
  const productUrl = `${env.APP_URL}/product/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "AzureHijabs" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: (product.variants[0]?.pricePaise ?? product.basePricePaise) / 100,
      highPrice: product.basePricePaise / 100,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  return (
    <div className="font-jakarta bg-[#fdf9f4]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-360 px-5 py-8 md:px-10 lg:px-16 lg:py-10">
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#4d4545]">
          <Link href="/shop" className="transition-colors hover:text-[#090707]">
            Shop
          </Link>
          <span className="text-[#d0c4c4]">/</span>
          <Link
            href={`/shop/${product.category.slug}`}
            className="transition-colors hover:text-[#090707]"
          >
            {product.category.name}
          </Link>
          <span className="text-[#d0c4c4]">/</span>
          <span className="font-medium text-[#090707]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="relative lg:col-span-7">
            <ProductGallery images={product.images} title={product.title} />
            <div className="absolute top-5 right-5 z-10">
              <Suspense fallback={null}>
                <ProductWishlistHeart productId={product.id} />
              </Suspense>
            </div>
          </div>

          <div className="flex flex-col lg:sticky lg:top-24 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] leading-none font-semibold tracking-widest text-[#79564f] uppercase">
                {product.category.name}
              </span>
              <span
                className={`font-jakarta rounded-full px-2.5 py-1 text-xs leading-none font-medium ${
                  inStock ? "bg-[#f1ede8] text-[#79564f]" : "bg-red-50 text-red-600"
                }`}
              >
                {inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <h1 className="font-playfair mt-1 text-[32px] leading-[1.2] text-[#090707]">
              {product.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="font-jakarta inline-flex items-center gap-1.5 rounded-full bg-[#f1ede8] px-3 py-1 text-sm text-[#1c1c19]">
                <Droplets className="h-4 w-4 text-[#79564f]" />
                {product.fabric}
              </span>
            </div>

            <div className="mt-6">
              <VariantSelector
                variants={product.variants}
                basePricePaise={product.basePricePaise}
                compareAtPaise={product.compareAtPaise}
              />
            </div>

            <div className="mt-6 space-y-3 rounded-xl bg-[#fdfbf7] p-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-[#1c1c19]">
                <Truck className="h-5 w-5 text-[#79564f]" />
                <span className="text-sm font-medium">
                  Free delivery on eligible orders
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[#1c1c19]">
                <ShieldCheck className="h-5 w-5 text-[#79564f]" />
                <span className="text-sm">Secure checkout via Razorpay</span>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl bg-[#fdfbf7] shadow-sm">
              <Accordion icon={<Info className="h-4.5 w-4.5" />} title="Description" defaultOpen>
                {product.description}
              </Accordion>
              {product.careInstructions && (
                <Accordion
                  icon={<Droplets className="h-4.5 w-4.5" />}
                  title="Care Instructions"
                >
                  {product.careInstructions}
                </Accordion>
              )}
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts productId={product.id} categoryId={product.categoryId} />
      </Suspense>
    </div>
  );
}
