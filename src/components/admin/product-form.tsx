"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createProductAction, updateProductAction } from "@/actions/admin/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductFormValues = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  collectionIds: string[];
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  fabric: string;
  careInstructions: string;
  basePriceRupees: string;
  compareAtRupees: string;
  seoTitle: string;
  seoDescription: string;
};

export function ProductForm({
  initial,
  categories,
  collections,
}: {
  initial?: ProductFormValues;
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(
    initial ?? {
      slug: "",
      title: "",
      description: "",
      categoryId: categories[0]?.id ?? "",
      collectionIds: [],
      status: "DRAFT",
      fabric: "",
      careInstructions: "",
      basePriceRupees: "",
      compareAtRupees: "",
      seoTitle: "",
      seoDescription: "",
    },
  );

  const createAction = useAction(createProductAction, {
    onSuccess: ({ data }) => {
      toast.success("Product created. Add images and variants below.");
      if (data?.id) router.push(`/admin/products/${data.id}`);
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't create product."),
  });
  const updateAction = useAction(updateProductAction, {
    onSuccess: () => {
      toast.success("Product updated.");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update product."),
  });

  const pending = createAction.isExecuting || updateAction.isExecuting;

  function toggleCollection(id: string) {
    setValues((prev) => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(id)
        ? prev.collectionIds.filter((c) => c !== id)
        : [...prev.collectionIds, id],
    }));
  }

  function submit() {
    const payload = {
      slug: values.slug.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
      categoryId: values.categoryId,
      collectionIds: values.collectionIds,
      status: values.status,
      fabric: values.fabric.trim(),
      careInstructions: values.careInstructions.trim() || undefined,
      basePricePaise: Math.round(Number(values.basePriceRupees) * 100),
      compareAtPaise: values.compareAtRupees ? Math.round(Number(values.compareAtRupees) * 100) : undefined,
      seoTitle: values.seoTitle.trim() || undefined,
      seoDescription: values.seoDescription.trim() || undefined,
    };
    if (values.id) {
      updateAction.execute({ id: values.id, ...payload });
    } else {
      createAction.execute(payload);
    }
  }

  const canSubmit =
    values.title &&
    values.slug &&
    values.description &&
    values.categoryId &&
    values.fabric &&
    values.basePriceRupees;

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <Input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <Input value={values.slug} onChange={(e) => setValues({ ...values, slug: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          rows={4}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
            value={values.categoryId}
            onChange={(e) => setValues({ ...values, categoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
            value={values.status}
            onChange={(e) =>
              setValues({ ...values, status: e.target.value as ProductFormValues["status"] })
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Fabric</label>
          <Input value={values.fabric} onChange={(e) => setValues({ ...values, fabric: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Collections</label>
        <div className="flex flex-wrap gap-3">
          {collections.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={values.collectionIds.includes(c.id)}
                onChange={() => toggleCollection(c.id)}
              />
              {c.name}
            </label>
          ))}
          {collections.length === 0 && <p className="text-sm text-stone-500">No collections yet.</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Care instructions</label>
        <textarea
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          rows={2}
          value={values.careInstructions}
          onChange={(e) => setValues({ ...values, careInstructions: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Base price (₹)</label>
          <Input
            type="number"
            value={values.basePriceRupees}
            onChange={(e) => setValues({ ...values, basePriceRupees: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Compare-at price (₹, optional)</label>
          <Input
            type="number"
            value={values.compareAtRupees}
            onChange={(e) => setValues({ ...values, compareAtRupees: e.target.value })}
          />
        </div>
      </div>

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">SEO (optional)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">SEO title</label>
            <Input value={values.seoTitle} onChange={(e) => setValues({ ...values, seoTitle: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">SEO description</label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
              rows={2}
              value={values.seoDescription}
              onChange={(e) => setValues({ ...values, seoDescription: e.target.value })}
            />
          </div>
        </div>
      </details>

      <Button disabled={!canSubmit || pending} onClick={submit}>
        {values.id ? "Save changes" : "Create product"}
      </Button>
    </div>
  );
}
