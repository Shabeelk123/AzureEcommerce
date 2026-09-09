import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug } from "@/lib/catalog";
import { ShopListing } from "@/components/shop/shop-listing";
import type { RawSearchParams } from "@/lib/shop-url";

// Prerenders every known category at build time; a category created later
// (via Phase 7's admin) still works instantly via the App Shell + ISR
// fallback described in the caching docs — it just isn't in the initial
// static shell until the next build or an on-demand revalidation.
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ categorySlug: c.slug }));
}

type Props = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  return (
    <ShopListing
      title={category.name}
      description={category.description ?? undefined}
      basePath={`/shop/${categorySlug}`}
      categorySlug={categorySlug}
      searchParams={searchParams}
    />
  );
}
