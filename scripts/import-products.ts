/**
 * Bulk product import — create many products (with real photos and
 * variants) from local folders in one run, instead of the admin panel's
 * one-product-at-a-time form.
 *
 * USAGE
 *   DATABASE_URL="..." R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." \
 *   R2_SECRET_ACCESS_KEY="..." R2_BUCKET="..." R2_PUBLIC_URL="..." \
 *   [APP_URL="https://your-app.onrender.com" REVALIDATE_SECRET="..."] \
 *   npx tsx scripts/import-products.ts [folder]
 *
 *   `folder` defaults to "products-import" in the repo root. APP_URL +
 *   REVALIDATE_SECRET are optional but recommended — without them the
 *   live site won't show the new products until it naturally revalidates
 *   or restarts (see src/app/api/admin/revalidate/route.ts).
 *
 * FOLDER LAYOUT
 *   products-import/
 *     chiffon-drape-hijab/
 *       product.json
 *       01-front.jpg
 *       02-draped.jpg
 *     another-product/
 *       product.json
 *       photo.jpg
 *
 *   The folder name is only for your own organization — the product's
 *   slug comes from product.json's "slug" field, or is generated from
 *   "title" if omitted. Every image file directly inside the folder
 *   (.jpg/.jpeg/.png/.webp/.avif) is attached, in filename order.
 *
 * product.json SHAPE
 *   {
 *     "title": "Chiffon Drape Hijab",
 *     "slug": "chiffon-drape-hijab",           // optional, derived from title
 *     "description": "A lightweight, semi-sheer chiffon...",
 *     "categorySlug": "hijabs",                 // must already exist
 *     "collectionSlugs": ["eid-edit"],           // optional
 *     "fabric": "Georgette Chiffon",
 *     "careInstructions": "Hand wash cold.",     // optional
 *     "basePriceRupees": 999,
 *     "compareAtRupees": 1249,                   // optional
 *     "seoTitle": "...",                          // optional
 *     "seoDescription": "...",                    // optional
 *     "status": "ACTIVE",                          // optional, default ACTIVE
 *     "variants": [
 *       { "colorName": "Champagne Gold", "colorHex": "#D9C08A", "stock": 20 },
 *       { "colorName": "Black", "stock": 30, "size": "One Size" }
 *     ]
 *   }
 *
 * Re-running is safe: a product whose slug already exists is skipped
 * (delete it in the admin panel first if you want to reimport it). One
 * bad product's folder never aborts the rest of the batch — errors are
 * collected and reported in the summary at the end.
 */
import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { imageSize } from "image-size";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

// Mirrors src/actions/admin/product.ts's productInputSchema/variantInputSchema
// (duplicated rather than imported — that file is a "use server" module
// that transitively pulls in "server-only" code, which can't run outside
// the Next.js server runtime this bare script isn't part of).
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "must be lowercase letters, numbers, and hyphens only");

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

const productJsonSchema = z.object({
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
  variants: z.array(variantSchema).min(1, "at least one variant is required"),
});

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
  // Extremely unlikely to collide (color names are per-product-slug
  // unique in practice), but stay correct rather than assume.
  while (await prisma.productVariant.findUnique({ where: { sku } })) {
    suffix += 1;
    sku = `${base}-${suffix}`;
  }
  return sku;
}

async function uploadImage(filePath: string, productSlug: string): Promise<{
  url: string;
  width: number;
  height: number;
}> {
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  const key = `products/${productSlug}-${nanoid()}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const { width, height } = imageSize(buffer);
  return { url: `${process.env.R2_PUBLIC_URL}/${key}`, width, height };
}

type ImportResult =
  | { status: "created"; slug: string }
  | { status: "skipped"; slug: string; reason: string }
  | { status: "failed"; folder: string; reason: string };

async function importOne(folder: string): Promise<ImportResult> {
  const folderPath = path.join(IMPORT_DIR, folder);
  const jsonPath = path.join(folderPath, "product.json");

  let raw: string;
  try {
    raw = await readFile(jsonPath, "utf-8");
  } catch {
    return { status: "failed", folder, reason: "no product.json found in this folder" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    return { status: "failed", folder, reason: `invalid JSON: ${(error as Error).message}` };
  }

  const parsed = productJsonSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      status: "failed",
      folder,
      reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const input = parsed.data;
  const slug = input.slug ?? slugify(input.title);

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return { status: "skipped", slug, reason: "a product with this slug already exists" };
  }

  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) {
    const available = (await prisma.category.findMany({ select: { slug: true } }))
      .map((c) => c.slug)
      .join(", ");
    return {
      status: "failed",
      folder,
      reason: `category "${input.categorySlug}" doesn't exist (available: ${available || "none — create one first"})`,
    };
  }

  const collections = await prisma.collection.findMany({
    where: { slug: { in: input.collectionSlugs } },
    select: { id: true, slug: true },
  });
  const missingCollections = input.collectionSlugs.filter(
    (s) => !collections.some((c) => c.slug === s),
  );
  if (missingCollections.length > 0) {
    console.warn(
      `  [${slug}] warning: collection(s) not found, skipping them: ${missingCollections.join(", ")}`,
    );
  }

  const entries = await readdir(folderPath, { withFileTypes: true });
  const imageFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
  if (imageFiles.length === 0) {
    return { status: "failed", folder, reason: "no image files found in this folder" };
  }

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
    },
  });

  for (const [index, fileName] of imageFiles.entries()) {
    const { url, width, height } = await uploadImage(path.join(folderPath, fileName), slug);
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        alt: input.title,
        width,
        height,
        sortOrder: index,
      },
    });
  }

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

  return { status: "created", slug };
}

async function triggerRevalidation() {
  const { APP_URL, REVALIDATE_SECRET } = process.env;
  if (!APP_URL || !REVALIDATE_SECRET) {
    console.log(
      "\nSkipping live-site cache revalidation (APP_URL / REVALIDATE_SECRET not set) — " +
        "restart the Render service, or wait for the cache to naturally expire, to see these products live.",
    );
    return;
  }
  try {
    const res = await fetch(`${APP_URL}/api/admin/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REVALIDATE_SECRET}`,
      },
      body: JSON.stringify({ tags: ["products", "categories", "collections"] }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    console.log("\nLive site cache revalidated — new products should show up immediately.");
  } catch (error) {
    console.warn(`\nCouldn't revalidate the live site's cache: ${(error as Error).message}`);
  }
}

const IMPORT_DIR = path.resolve(process.argv[2] ?? "products-import");

async function main() {
  const dirStat = await stat(IMPORT_DIR).catch(() => null);
  if (!dirStat?.isDirectory()) {
    console.error(`Import folder not found: ${IMPORT_DIR}`);
    console.error(`Create it (or pass a path) — see the usage comment at the top of this script.`);
    process.exitCode = 1;
    return;
  }

  const entries = await readdir(IMPORT_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (folders.length === 0) {
    console.log(`No product folders found in ${IMPORT_DIR}.`);
    return;
  }

  console.log(`Found ${folders.length} product folder(s) in ${IMPORT_DIR}.\n`);

  const results: ImportResult[] = [];
  for (const folder of folders) {
    console.log(`Importing "${folder}"...`);
    const result = await importOne(folder).catch(
      (error): ImportResult => ({ status: "failed", folder, reason: (error as Error).message }),
    );
    results.push(result);
    if (result.status === "created") console.log(`  created: ${result.slug}`);
    else if (result.status === "skipped") console.log(`  skipped: ${result.reason}`);
    else console.log(`  FAILED: ${result.reason}`);
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed.`);

  if (created > 0) await triggerRevalidation();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
