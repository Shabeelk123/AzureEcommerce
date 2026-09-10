-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- Note: Prisma's schema diff also proposed dropping "Product_searchVector_idx"
-- and altering the searchVector column's default — both spurious, for the
-- same reason documented in add_order_cart_reference/migration.sql: Prisma
-- can't see the GENERATED ALWAYS AS (...) STORED definition on a column
-- modeled as Unsupported("tsvector"), so it misreads it as drift.
-- Deliberately omitted both statements.
