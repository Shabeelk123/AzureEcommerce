import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PLACEHOLDER_IMAGE = (seed: string, w = 1200, h = 1500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

type SeedVariant = {
  colorName: string;
  colorHex: string;
  size?: string;
  stock: number;
};

type SeedProduct = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  collectionSlugs: string[];
  fabric: string;
  careInstructions: string;
  basePricePaise: number;
  compareAtPaise?: number;
  variants: SeedVariant[];
};

const CATEGORIES = [
  { slug: "everyday-hijabs", name: "Everyday Hijabs", sortOrder: 1 },
  { slug: "premium-hijabs", name: "Premium Hijabs", sortOrder: 2 },
  { slug: "instant-hijabs", name: "Instant & Slip-On", sortOrder: 3 },
  { slug: "underscarves", name: "Underscarves & Caps", sortOrder: 4 },
];

const COLLECTIONS = [
  { slug: "everyday-jersey", name: "Everyday Jersey", isFeatured: true },
  { slug: "eid-edit", name: "The Eid Edit", isFeatured: true },
  { slug: "monsoon-modal", name: "Monsoon Modal", isFeatured: false },
];

const SIZES = ["One Size"] as const;

const PRODUCTS: SeedProduct[] = [
  {
    slug: "signature-jersey-hijab",
    title: "Signature Jersey Hijab",
    description:
      "Our best-selling everyday hijab in a soft, structured jersey knit that drapes without slipping. Breathable enough for all-day wear, with just enough stretch to pin effortlessly.",
    categorySlug: "everyday-hijabs",
    collectionSlugs: ["everyday-jersey"],
    fabric: "Premium Viscose Jersey",
    careInstructions: "Hand wash cold, lay flat to dry, cool iron if needed.",
    basePricePaise: 79900,
    variants: [
      { colorName: "Sage Green", colorHex: "#8A9A7B", stock: 40 },
      { colorName: "Dusty Rose", colorHex: "#C58F8F", stock: 35 },
      { colorName: "Charcoal", colorHex: "#3B3B3D", stock: 50 },
      { colorName: "Ivory", colorHex: "#F1EDE4", stock: 30 },
      { colorName: "Terracotta", colorHex: "#B5654A", stock: 25 },
    ],
  },
  {
    slug: "chiffon-drape-hijab",
    title: "Chiffon Drape Hijab",
    description:
      "A lightweight, semi-sheer chiffon with a beautiful fluid drape — ideal for layering or occasions where you want extra volume and movement.",
    categorySlug: "premium-hijabs",
    collectionSlugs: ["eid-edit"],
    fabric: "Georgette Chiffon",
    careInstructions: "Hand wash cold, do not wring, iron on low heat.",
    basePricePaise: 99900,
    compareAtPaise: 124900,
    variants: [
      { colorName: "Champagne Gold", colorHex: "#D9C08A", stock: 20 },
      { colorName: "Emerald", colorHex: "#2F5E4E", stock: 18 },
      { colorName: "Wine", colorHex: "#5E2A3B", stock: 22 },
      { colorName: "Black", colorHex: "#111113", stock: 30 },
    ],
  },
  {
    slug: "modal-everyday-hijab",
    title: "Modal Everyday Hijab",
    description:
      "Buttery-soft modal fabric that stays cool in humidity and resists creasing — a monsoon-season favorite that still holds its shape.",
    categorySlug: "everyday-hijabs",
    collectionSlugs: ["monsoon-modal"],
    fabric: "Bamboo Modal",
    careInstructions: "Machine wash cold on gentle, tumble dry low.",
    basePricePaise: 84900,
    variants: [
      { colorName: "Slate Blue", colorHex: "#5C7A99", stock: 28 },
      { colorName: "Olive", colorHex: "#6B7A4F", stock: 24 },
      { colorName: "Blush", colorHex: "#E3B9B1", stock: 26 },
      { colorName: "Black", colorHex: "#111113", stock: 40 },
    ],
  },
  {
    slug: "satin-lined-hijab",
    title: "Satin-Lined Premium Hijab",
    description:
      "A dual-layer hijab with a satin lining that glides against hair instead of catching on it — reduces frizz and keeps your style in place longer.",
    categorySlug: "premium-hijabs",
    collectionSlugs: ["eid-edit"],
    fabric: "Crepe with Satin Lining",
    careInstructions: "Hand wash cold, dry flat away from direct sun.",
    basePricePaise: 129900,
    compareAtPaise: 149900,
    variants: [
      { colorName: "Midnight Navy", colorHex: "#1F2A44", stock: 15 },
      { colorName: "Deep Plum", colorHex: "#4A2A4A", stock: 15 },
      { colorName: "Camel", colorHex: "#B9925A", stock: 18 },
    ],
  },
  {
    slug: "instant-slip-on-hijab",
    title: "Instant Slip-On Hijab",
    description:
      "No pins, no wrapping — a pre-styled, one-piece hijab that slips on in seconds. Built-in underscarve for full coverage, perfect for busy mornings.",
    categorySlug: "instant-hijabs",
    collectionSlugs: ["everyday-jersey"],
    fabric: "Cotton-Jersey Blend",
    careInstructions: "Machine wash cold, tumble dry low.",
    basePricePaise: 69900,
    variants: [
      { colorName: "Black", colorHex: "#111113", size: "One Size", stock: 45 },
      { colorName: "Grey Marl", colorHex: "#9A9A9C", size: "One Size", stock: 30 },
      { colorName: "Navy", colorHex: "#22324F", size: "One Size", stock: 32 },
    ],
  },
  {
    slug: "cotton-voile-hijab",
    title: "Cotton Voile Hijab",
    description:
      "A crisp, lightweight cotton voile with a matte finish — breathable structure for warm days without feeling flimsy.",
    categorySlug: "everyday-hijabs",
    collectionSlugs: [],
    fabric: "100% Cotton Voile",
    careInstructions: "Machine wash cold, iron warm while slightly damp.",
    basePricePaise: 74900,
    variants: [
      { colorName: "Powder Blue", colorHex: "#AFC7D6", stock: 20 },
      { colorName: "Mustard", colorHex: "#C9A227", stock: 18 },
      { colorName: "White", colorHex: "#FAFAF8", stock: 25 },
    ],
  },
  {
    slug: "georgette-embroidered-hijab",
    title: "Georgette Embroidered Hijab",
    description:
      "Fine floral embroidery along one edge on a flowing georgette base — a statement piece for festive occasions.",
    categorySlug: "premium-hijabs",
    collectionSlugs: ["eid-edit"],
    fabric: "Embroidered Georgette",
    careInstructions: "Dry clean recommended; hand wash cold as an alternative.",
    basePricePaise: 159900,
    variants: [
      { colorName: "Rose Gold", colorHex: "#C48B87", stock: 12 },
      { colorName: "Sapphire", colorHex: "#2C4870", stock: 10 },
      { colorName: "Ivory Gold", colorHex: "#EDE2C8", stock: 10 },
    ],
  },
  {
    slug: "everyday-crepe-hijab",
    title: "Everyday Crepe Hijab",
    description:
      "A textured crepe with natural non-slip grip, so it stays put through a full day without constant re-pinning.",
    categorySlug: "everyday-hijabs",
    collectionSlugs: ["everyday-jersey"],
    fabric: "Textured Crepe",
    careInstructions: "Hand wash cold, hang dry.",
    basePricePaise: 89900,
    variants: [
      { colorName: "Forest Green", colorHex: "#2F4A3A", stock: 22 },
      { colorName: "Burgundy", colorHex: "#5C2331", stock: 20 },
      { colorName: "Taupe", colorHex: "#A79683", stock: 24 },
      { colorName: "Black", colorHex: "#111113", stock: 30 },
    ],
  },
  {
    slug: "bamboo-jersey-underscarf",
    title: "Bamboo Jersey Underscarf Cap",
    description:
      "A breathable, seamless underscarf cap that holds hair fully in place under any hijab — soft elastic band, no headache-inducing pinch.",
    categorySlug: "underscarves",
    collectionSlugs: [],
    fabric: "Bamboo Jersey",
    careInstructions: "Machine wash cold, tumble dry low.",
    basePricePaise: 29900,
    variants: [
      { colorName: "Black", colorHex: "#111113", size: "One Size", stock: 60 },
      { colorName: "White", colorHex: "#FAFAF8", size: "One Size", stock: 50 },
      { colorName: "Beige", colorHex: "#D9C7A8", size: "One Size", stock: 40 },
    ],
  },
  {
    slug: "silk-feel-hijab",
    title: "Silk-Feel Occasion Hijab",
    description:
      "A luxurious silk-feel finish with a subtle sheen, cut generously for elegant draping at weddings and celebrations.",
    categorySlug: "premium-hijabs",
    collectionSlugs: ["eid-edit"],
    fabric: "Silk-Feel Polyester Blend",
    careInstructions: "Dry clean only.",
    basePricePaise: 149900,
    compareAtPaise: 179900,
    variants: [
      { colorName: "Champagne", colorHex: "#E4D3B0", stock: 14 },
      { colorName: "Black", colorHex: "#111113", stock: 18 },
      { colorName: "Teal", colorHex: "#1F5C5C", stock: 12 },
    ],
  },
  {
    slug: "rib-knit-instant-hijab",
    title: "Rib-Knit Instant Hijab",
    description:
      "A ribbed knit slip-on with extra stretch recovery — holds a close, sporty fit that won't loosen through the day.",
    categorySlug: "instant-hijabs",
    collectionSlugs: ["monsoon-modal"],
    fabric: "Rib-Knit Cotton Blend",
    careInstructions: "Machine wash cold, lay flat to dry.",
    basePricePaise: 72900,
    variants: [
      { colorName: "Heather Grey", colorHex: "#A9A9AC", size: "One Size", stock: 26 },
      { colorName: "Dusty Pink", colorHex: "#D8A9A9", size: "One Size", stock: 22 },
      { colorName: "Black", colorHex: "#111113", size: "One Size", stock: 34 },
    ],
  },
  {
    slug: "linen-blend-hijab",
    title: "Linen-Blend Hijab",
    description:
      "A relaxed linen-cotton blend with natural texture and superior breathability — favors a slightly looser, effortless drape.",
    categorySlug: "everyday-hijabs",
    collectionSlugs: [],
    fabric: "Linen-Cotton Blend",
    careInstructions: "Machine wash cold, iron warm.",
    basePricePaise: 94900,
    variants: [
      { colorName: "Stone", colorHex: "#B9AF9E", stock: 20 },
      { colorName: "Clay", colorHex: "#A65D40", stock: 18 },
      { colorName: "Deep Teal", colorHex: "#1F4A4A", stock: 16 },
    ],
  },
];

async function main() {
  console.log("Seeding categories...");
  const categoryBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: {
        slug: c.slug,
        name: c.name,
        sortOrder: c.sortOrder,
        image: PLACEHOLDER_IMAGE(`category-${c.slug}`, 800, 600),
      },
    });
    categoryBySlug.set(c.slug, category.id);
  }

  console.log("Seeding collections...");
  const collectionBySlug = new Map<string, string>();
  for (const col of COLLECTIONS) {
    const collection = await prisma.collection.upsert({
      where: { slug: col.slug },
      update: { name: col.name, isFeatured: col.isFeatured },
      create: {
        slug: col.slug,
        name: col.name,
        isFeatured: col.isFeatured,
        heroImage: PLACEHOLDER_IMAGE(`collection-${col.slug}`, 1600, 900),
      },
    });
    collectionBySlug.set(col.slug, collection.id);
  }

  console.log("Seeding products...");
  for (const p of PRODUCTS) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.categorySlug}`);

    const collectionIds = p.collectionSlugs.map((slug) => {
      const id = collectionBySlug.get(slug);
      if (!id) throw new Error(`Unknown collection slug: ${slug}`);
      return { id };
    });

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        categoryId,
        fabric: p.fabric,
        careInstructions: p.careInstructions,
        basePricePaise: p.basePricePaise,
        compareAtPaise: p.compareAtPaise ?? null,
        status: "ACTIVE",
        publishedAt: new Date(),
        collections: { set: collectionIds },
      },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        categoryId,
        fabric: p.fabric,
        careInstructions: p.careInstructions,
        basePricePaise: p.basePricePaise,
        compareAtPaise: p.compareAtPaise ?? null,
        status: "ACTIVE",
        publishedAt: new Date(),
        collections: { connect: collectionIds },
        seoTitle: `${p.title} | AzureHijabs`,
        seoDescription: p.description.slice(0, 155),
      },
    });

    // Images: two angles per product, deterministic placeholder per slug.
    const existingImages = await prisma.productImage.count({
      where: { productId: product.id },
    });
    if (existingImages === 0) {
      await prisma.productImage.createMany({
        data: [
          {
            productId: product.id,
            url: PLACEHOLDER_IMAGE(`${p.slug}-1`),
            alt: `${p.title} — front`,
            width: 1200,
            height: 1500,
            sortOrder: 0,
          },
          {
            productId: product.id,
            url: PLACEHOLDER_IMAGE(`${p.slug}-2`),
            alt: `${p.title} — draped`,
            width: 1200,
            height: 1500,
            sortOrder: 1,
          },
        ],
      });
    }

    for (const v of p.variants) {
      const size = v.size ?? SIZES[0];
      const sku = `AZH-${p.slug.toUpperCase().replace(/-/g, "").slice(0, 10)}-${v.colorName
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 6)}`;

      await prisma.productVariant.upsert({
        where: {
          productId_colorName_size: {
            productId: product.id,
            colorName: v.colorName,
            size,
          },
        },
        update: { stock: v.stock, colorHex: v.colorHex },
        create: {
          productId: product.id,
          sku,
          colorName: v.colorName,
          colorHex: v.colorHex,
          size,
          stock: v.stock,
          weightGrams: 100,
        },
      });
    }
  }

  console.log("Seeding launch coupon...");
  await prisma.coupon.upsert({
    where: { code: "AZURE10" },
    update: {},
    create: {
      code: "AZURE10",
      type: "PERCENT",
      value: 10,
      minSubtotalPaise: 99900,
      maxRedemptions: 500,
      isActive: true,
    },
  });

  console.log("Seeding admin user...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@azurehijabs.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345";
  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash,
      name: "AzureHijabs Admin",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(
    `Admin user ready: ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ? "(from SEED_ADMIN_PASSWORD)" : adminPassword}`,
  );

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
