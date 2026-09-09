-- Full-text search column, computed and kept in sync by Postgres itself
-- (GENERATED ALWAYS ... STORED) on every INSERT/UPDATE — no application
-- code or Prisma write ever touches this column directly.
--
-- Weighted: title matches rank highest (A), fabric next (B), the free-text
-- description last (C) — so a search for "chiffon" ranks a product whose
-- title says "Chiffon Drape Hijab" above one that merely mentions chiffon
-- in a paragraph of care instructions.
ALTER TABLE "Product"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("fabric", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
