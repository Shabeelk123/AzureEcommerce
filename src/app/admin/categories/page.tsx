import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { listCategoriesForAdmin } from "@/lib/admin/category";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Categories" };

async function CategoryList() {
  await requireAdmin();
  const categories = await listCategoriesForAdmin();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Categories</h1>
        <Button asChild size="sm">
          <Link href="/admin/categories/new">New category</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Sort</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-stone-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/categories/${category.id}`} className="font-medium hover:underline">
                    {category.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-stone-500">{category.slug}</td>
                <td className="px-4 py-2">{category._count.products}</td>
                <td className="px-4 py-2">{category.sortOrder}</td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CategoryList />
    </Suspense>
  );
}
