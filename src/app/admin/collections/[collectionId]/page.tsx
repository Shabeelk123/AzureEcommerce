import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getCollectionForAdmin } from "@/lib/admin/collection";
import { CollectionForm } from "@/components/admin/collection-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Edit collection" };

type Props = { params: Promise<{ collectionId: string }> };

async function EditCollection({ params }: Props) {
  await requireAdmin();
  const { collectionId } = await params;
  const collection = await getCollectionForAdmin(collectionId);
  if (!collection) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Edit collection</h1>
      <CollectionForm
        initial={{
          id: collection.id,
          slug: collection.slug,
          name: collection.name,
          heroImage: collection.heroImage ?? "",
          isFeatured: collection.isFeatured,
        }}
      />
    </div>
  );
}

export default function EditCollectionPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <EditCollection params={params} />
    </Suspense>
  );
}
