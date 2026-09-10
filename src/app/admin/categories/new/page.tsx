import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { CategoryForm } from "@/components/admin/category-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "New category" };

async function NewCategoryContent() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">New category</h1>
      <CategoryForm />
    </div>
  );
}

export default function NewCategoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <NewCategoryContent />
    </Suspense>
  );
}
