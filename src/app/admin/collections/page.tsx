import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { listCollectionsForAdmin } from "@/lib/admin/collection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Collections" };

async function CollectionList() {
  await requireAdmin();
  const collections = await listCollectionsForAdmin();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Collections</h1>
        <Button asChild size="sm">
          <Link href="/admin/collections/new">New collection</Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Featured</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {collections.map((collection) => (
              <tr key={collection.id} className="hover:bg-stone-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/collections/${collection.id}`} className="font-medium hover:underline">
                    {collection.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-stone-500">{collection.slug}</td>
                <td className="px-4 py-2">{collection._count.products}</td>
                <td className="px-4 py-2">{collection.isFeatured ? "Yes" : "—"}</td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No collections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminCollectionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CollectionList />
    </Suspense>
  );
}
