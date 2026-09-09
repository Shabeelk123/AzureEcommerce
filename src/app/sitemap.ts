import type { MetadataRoute } from "next";
import { getCategories, getCollections, getProducts } from "@/lib/catalog";
import { env } from "@/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, { products }] = await Promise.all([
    getCategories(),
    getCollections(),
    // A real catalog would page through every product rather than one
    // page — fine for now at seed-data scale; revisit alongside admin
    // product CRUD in Phase 7.
    getProducts({ page: 1 }),
  ]);

  const base = env.APP_URL;

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/search`, changeFrequency: "monthly", priority: 0.3 },
    ...categories.map((c) => ({
      url: `${base}/shop/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...collections.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
