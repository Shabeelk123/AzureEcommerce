import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getProductForAdmin } from "@/lib/admin/product";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { ProductVariantsPanel } from "@/components/admin/product-variants-panel";
import { ProductImagesPanel } from "@/components/admin/product-images-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Edit product" };

type Props = { params: Promise<{ productId: string }> };

async function EditProduct({ params }: Props) {
  await requireAdmin();
  const { productId } = await params;
  const [product, categories, collections] = await Promise.all([
    getProductForAdmin(productId),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">{product.title}</h1>
      <ProductForm
        categories={categories}
        collections={collections}
        initial={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          categoryId: product.categoryId,
          collectionIds: product.collections.map((c) => c.id),
          status: product.status,
          fabric: product.fabric,
          careInstructions: product.careInstructions ?? "",
          basePriceRupees: String(product.basePricePaise / 100),
          compareAtRupees: product.compareAtPaise ? String(product.compareAtPaise / 100) : "",
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
        }}
      />
      <ProductImagesPanel productId={product.id} images={product.images} />
      <ProductVariantsPanel productId={product.id} variants={product.variants} />
    </div>
  );
}

export default function EditProductPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
      <EditProduct params={params} />
    </Suspense>
  );
}
