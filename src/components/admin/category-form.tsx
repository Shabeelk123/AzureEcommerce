"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import Image from "next/image";
import { createCategoryAction, updateCategoryAction } from "@/actions/admin/category";
import { createPresignedUploadUrlAction } from "@/actions/admin/storage";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const presignAction = useAction(createPresignedUploadUrlAction);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presignResult = await presignAction.executeAsync({
        contentType: file.type,
        folder: "categories",
      });
      const presigned = presignResult?.data;
      if (!presigned) throw new Error(presignResult?.serverError ?? "Couldn't get an upload URL.");

      // Same direct-to-R2 pattern as the product image panel: the file's
      // bytes go straight from this browser to R2 via the presigned PUT
      // URL, and the server never touches them.
      const putResponse = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResponse.ok) throw new Error("Upload to storage failed.");

      setValues((prev) => ({ ...prev, image: presigned.publicUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
        <label className="mb-1 block text-sm font-medium">Image</label>
        <div className="flex items-center gap-3">
          {values.image && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
              <Image src={values.image} alt="" fill className="object-cover" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : values.image ? "Replace image" : "Upload image"}
          </Button>
        </div>
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
