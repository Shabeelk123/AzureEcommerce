import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "New product" };

async function NewProductForm() {
  await requireAdmin();
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">New product</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-amber-700">
          Create at least one category before adding a product.
        </p>
      ) : (
        <ProductForm categories={categories} collections={collections} />
      )}
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <NewProductForm />
    </Suspense>
  );
}
