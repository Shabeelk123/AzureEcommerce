import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { CollectionForm } from "@/components/admin/collection-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "New collection" };

async function NewCollectionContent() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">New collection</h1>
      <CollectionForm />
    </div>
  );
}

export default function NewCollectionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <NewCollectionContent />
    </Suspense>
  );
}
