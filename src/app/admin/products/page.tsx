import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { listProductsForAdmin } from "@/lib/admin/product";
import { formatINR } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Products" };

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

const STATUSES: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

async function ProductList({ searchParams }: Props) {
  await requireAdmin();
  const { q, status, page } = await searchParams;
  const { products, total, pageCount, page: currentPage } = await listProductsForAdmin({
    search: q,
    status: status && STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : undefined,
    page: page ? Number(page) : 1,
  });

  const baseParams = { ...(q ? { q } : {}), ...(status ? { status } : {}) };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Products ({total})</h1>
        <Button asChild size="sm">
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2">
          <Input name="q" placeholder="Search title or slug" defaultValue={q} className="max-w-sm" />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <div className="flex gap-1 text-sm">
          <Link
            href="/admin/products"
            className={!status ? "font-semibold underline" : "text-stone-500 hover:underline"}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), status: s })}`}
              className={status === s ? "font-semibold underline" : "text-stone-500 hover:underline"}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Variants</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const totalStock = product.variants.reduce((sum, v) => sum + (v.isActive ? 1 : 0), 0);
              return (
                <tr key={product.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">
                      {product.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-stone-500">{product.category.name}</td>
                  <td className="px-4 py-2">{formatINR(product.basePricePaise)}</td>
                  <td className="px-4 py-2">{totalStock} active</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                      {product.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex gap-2 text-sm">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/products?${new URLSearchParams({ ...baseParams, page: String(p) })}`}
              className={p === currentPage ? "font-semibold underline" : "text-stone-500 hover:underline"}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProductList searchParams={searchParams} />
    </Suspense>
  );
}
