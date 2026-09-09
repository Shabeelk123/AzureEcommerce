import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/catalog";
import { VariantSelector } from "@/components/shop/variant-selector";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductCard } from "@/components/shop/product-card";
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
  const related = await getRelatedProducts(productId, categoryId);
  if (related.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="mb-6 text-xl font-semibold tracking-tight">You may also like</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-4/5 w-full rounded-lg" />
        ))}
      </div>
    </div>
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
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav className="text-muted-foreground mb-6 text-sm">
          <Link href="/shop" className="hover:text-foreground">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/shop/${product.category.slug}`} className="hover:text-foreground">
            {product.category.name}
          </Link>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ProductGallery images={product.images} title={product.title} />

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{product.fabric}</p>

            <div className="mt-6">
              <VariantSelector
                variants={product.variants}
                basePricePaise={product.basePricePaise}
                compareAtPaise={product.compareAtPaise}
              />
            </div>

            <div className="mt-8 space-y-4 border-t pt-6 text-sm">
              <div>
                <h2 className="mb-1 font-medium">Description</h2>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
              {product.careInstructions && (
                <div>
                  <h2 className="mb-1 font-medium">Care instructions</h2>
                  <p className="text-muted-foreground">{product.careInstructions}</p>
                </div>
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
