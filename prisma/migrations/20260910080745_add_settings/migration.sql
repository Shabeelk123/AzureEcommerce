-- Prisma's diff can't see the hand-written `GENERATED ALWAYS AS (...) STORED`
-- searchVector column (Unsupported("tsvector")); it proposes dropping its
-- GIN index and clearing a "default" it never had. Stripped — see
-- prisma/migrations/.../add_full_text_search/migration.sql for the real
-- definition, which this migration must not touch.

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "shippingFlatPaise" INTEGER NOT NULL DEFAULT 7900,
    "freeShippingThresholdPaise" INTEGER NOT NULL DEFAULT 99900,
    "storeName" TEXT NOT NULL DEFAULT 'AzureHijabs',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@azurehijabs.com',
    "supportPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
