import type { Metadata } from "next";
import { ShopListing } from "@/components/shop/shop-listing";
import type { RawSearchParams } from "@/lib/shop-url";

export const metadata: Metadata = { title: "Shop all" };

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <ShopListing title="Shop all" basePath="/shop" searchParams={searchParams} />;
}
