-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cartId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: Prisma's schema diff also proposed dropping "Product_searchVector_idx"
-- and altering the searchVector column's default — both spurious. Prisma's
-- introspection can't see the GENERATED ALWAYS AS (...) STORED definition
-- from the add_product_search_vector migration (the column is modeled as
-- Unsupported("tsvector") precisely because Prisma doesn't understand
-- generated columns), so it misreads the live schema as drift. Dropping
-- the GIN index would silently degrade search to a sequential scan;
-- altering a GENERATED column's "default" isn't valid SQL and would have
-- errored the migration outright. Deliberately omitted both statements.
