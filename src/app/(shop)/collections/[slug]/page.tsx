import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug, getCollections } from "@/lib/catalog";
import { ShopListing } from "@/components/shop/shop-listing";
import type { RawSearchParams } from "@/lib/shop-url";

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  return { title: collection.name };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  return (
    <ShopListing
      title={collection.name}
      basePath={`/collections/${slug}`}
      collectionSlug={slug}
      searchParams={searchParams}
    />
  );
}
