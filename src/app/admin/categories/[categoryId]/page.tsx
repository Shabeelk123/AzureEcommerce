import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getCategoryForAdmin } from "@/lib/admin/category";
import { CategoryForm } from "@/components/admin/category-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Edit category" };

type Props = { params: Promise<{ categoryId: string }> };

async function EditCategory({ params }: Props) {
  await requireAdmin();
  const { categoryId } = await params;
  const category = await getCategoryForAdmin(categoryId);
  if (!category) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Edit category</h1>
      <CategoryForm
        initial={{
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description ?? "",
          image: category.image ?? "",
          sortOrder: category.sortOrder,
        }}
      />
    </div>
  );
}

export default function EditCategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <EditCategory params={params} />
    </Suspense>
  );
}
