"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createCategoryAction, updateCategoryAction } from "@/actions/admin/category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CategoryFormValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
};

export function CategoryForm({ initial }: { initial?: CategoryFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>(
    initial ?? { slug: "", name: "", description: "", image: "", sortOrder: 0 },
  );

  const createAction = useAction(createCategoryAction, {
    onSuccess: () => {
      toast.success("Category created.");
      router.push("/admin/categories");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't create category."),
  });
  const updateAction = useAction(updateCategoryAction, {
    onSuccess: () => {
      toast.success("Category updated.");
      router.push("/admin/categories");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update category."),
  });

  const pending = createAction.isExecuting || updateAction.isExecuting;

  function submit() {
    const payload = {
      slug: values.slug.trim(),
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      image: values.image.trim() || undefined,
      sortOrder: values.sortOrder,
    };
    if (values.id) {
      updateAction.execute({ id: values.id, ...payload });
    } else {
      createAction.execute(payload);
    }
  }

  return (
    <div className="max-w-lg space-y-4 rounded-lg border bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Slug</label>
        <Input value={values.slug} onChange={(e) => setValues({ ...values, slug: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          rows={3}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Image URL</label>
        <Input value={values.image} onChange={(e) => setValues({ ...values, image: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Sort order</label>
        <Input
          type="number"
          value={values.sortOrder}
          onChange={(e) => setValues({ ...values, sortOrder: Number(e.target.value) })}
        />
      </div>
      <Button disabled={!values.name || !values.slug || pending} onClick={submit}>
        {values.id ? "Save changes" : "Create category"}
      </Button>
    </div>
  );
}
