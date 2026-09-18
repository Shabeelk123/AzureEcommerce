import "server-only";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadImageBase64, uploadImageFromUrl } from "@/lib/storage";

export class BulkImportError extends Error {}

const base64ImageSchema = z.object({
  base64: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
});

const variantSchema = z.object({
  colorName: z.string().trim().min(1).max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#9ca3af"),
  size: z.string().trim().max(20).optional(),
  length: z.string().trim().max(20).optional(),
  priceRupees: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weightGrams: z.number().int().positive().default(100),
});

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "must be lowercase letters, numbers, and hyphens only");

// Mirrors src/actions/admin/product.ts's productInputSchema/variantInputSchema
// — kept as a separate copy rather than imported, since that file is a
// "use server" actions module meant to be called from client components,
// not a shared library both it and this route should depend on.
export const productImportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: slugSchema.optional(),
  description: z.string().trim().min(1).max(10_000),
  categorySlug: z.string().min(1),
  collectionSlugs: z.array(z.string().min(1)).default([]),
  fabric: z.string().trim().min(1).max(120),
  careInstructions: z.string().trim().max(2000).optional(),
  basePriceRupees: z.number().positive(),
  compareAtRupees: z.number().positive().optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  // Either (or both) — a publicly fetchable URL per image, or the raw
  // bytes base64-encoded (for a caller with local files and no public
  // host to link to, e.g. n8n's Read/Write Files from Disk node).
  // Attached in the order given, imageUrls first.
  imageUrls: z.array(z.url()).default([]),
  images: z.array(base64ImageSchema).default([]),
  variants: z.array(variantSchema).min(1, "at least one variant is required"),
}).refine((data) => data.imageUrls.length + data.images.length > 0, {
  message: "at least one image is required, via imageUrls or images",
  path: ["imageUrls"],
});

export type ProductImportInput = z.infer<typeof productImportSchema>;

export type ImportOutcome =
  | { created: true; id: string; slug: string; warnings: string[] }
  | { created: false; slug: string; reason: string };

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

async function generateSku(productSlug: string, colorName: string): Promise<string> {
  const base = `AZH-${productSlug.toUpperCase().replace(/-/g, "").slice(0, 10)}-${colorName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6)}`;
  let sku = base;
  let suffix = 1;
  while (await prisma.productVariant.findUnique({ where: { sku } })) {
    suffix += 1;
    sku = `${base}-${suffix}`;
  }
  return sku;
}

/**
 * Creates one product — with images fetched from external URLs and
 * re-uploaded to R2, plus variants — from an n8n (or any HTTP caller)
 * request. Idempotent by slug: a product that already exists is reported
 * as not created rather than erroring, so a retried/duplicate workflow run
 * is harmless.
 */
export async function importProduct(input: ProductImportInput): Promise<ImportOutcome> {
  const slug = input.slug ?? slugify(input.title);

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return { created: false, slug, reason: "a product with this slug already exists" };
  }

  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) {
    const available = (await prisma.category.findMany({ select: { slug: true } }))
      .map((c) => c.slug)
      .join(", ");
    throw new BulkImportError(
      `category "${input.categorySlug}" doesn't exist (available: ${available || "none — create one first"})`,
    );
  }

  const collections = await prisma.collection.findMany({
    where: { slug: { in: input.collectionSlugs } },
    select: { id: true, slug: true },
  });
  const warnings = input.collectionSlugs
    .filter((s) => !collections.some((c) => c.slug === s))
    .map((s) => `collection "${s}" doesn't exist, skipped`);

  // Fetch/upload every image before writing anything to the DB, so a bad
  // image fails the whole request instead of leaving a half-created
  // product behind. URLs first, then base64 payloads, preserving the
  // caller's intended gallery order.
  const uploaded = await Promise.all([
    ...input.imageUrls.map((url) => uploadImageFromUrl(url, "products")),
    ...input.images.map((img) => uploadImageBase64(img.base64, img.contentType, "products")),
  ]);

  const product = await prisma.product.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      categoryId: category.id,
      collections: { connect: collections.map((c) => ({ id: c.id })) },
      status: input.status,
      fabric: input.fabric,
      careInstructions: input.careInstructions,
      basePricePaise: toPaise(input.basePriceRupees),
      compareAtPaise: input.compareAtRupees ? toPaise(input.compareAtRupees) : null,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      publishedAt: input.status === "ACTIVE" ? new Date() : null,
      images: {
        create: uploaded.map((img, index) => ({
          url: img.url,
          alt: input.title,
          width: img.width,
          height: img.height,
          sortOrder: index,
        })),
      },
    },
  });

  for (const v of input.variants) {
    const sku = await generateSku(slug, v.colorName);
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        colorName: v.colorName,
        colorHex: v.colorHex,
        size: v.size ?? null,
        length: v.length ?? null,
        pricePaise: v.priceRupees ? toPaise(v.priceRupees) : null,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        weightGrams: v.weightGrams,
      },
    });
  }

  // revalidateTag, not the Server-Action-oriented invalidateTag helper
  // (src/lib/cache-tags.ts) — this runs in a Route Handler, where
  // updateTag is unavailable, and { expire: 0 } is the documented way to
  // get the tag gone immediately rather than served stale-while-revalidating.
  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });

  return { created: true, id: product.id, slug, warnings };
}
