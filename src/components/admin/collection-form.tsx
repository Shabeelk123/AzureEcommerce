"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createCollectionAction, updateCollectionAction } from "@/actions/admin/collection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CollectionFormValues = {
  id?: string;
  slug: string;
  name: string;
  heroImage: string;
  isFeatured: boolean;
};

export function CollectionForm({ initial }: { initial?: CollectionFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<CollectionFormValues>(
    initial ?? { slug: "", name: "", heroImage: "", isFeatured: false },
  );

  const createAction = useAction(createCollectionAction, {
    onSuccess: () => {
      toast.success("Collection created.");
      router.push("/admin/collections");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't create collection."),
  });
  const updateAction = useAction(updateCollectionAction, {
    onSuccess: () => {
      toast.success("Collection updated.");
      router.push("/admin/collections");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update collection."),
  });

  const pending = createAction.isExecuting || updateAction.isExecuting;

  function submit() {
    const payload = {
      slug: values.slug.trim(),
      name: values.name.trim(),
      heroImage: values.heroImage.trim() || undefined,
      isFeatured: values.isFeatured,
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
        <label className="mb-1 block text-sm font-medium">Hero image URL</label>
        <Input
          value={values.heroImage}
          onChange={(e) => setValues({ ...values, heroImage: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isFeatured}
          onChange={(e) => setValues({ ...values, isFeatured: e.target.checked })}
        />
        Featured on homepage
      </label>
      <Button disabled={!values.name || !values.slug || pending} onClick={submit}>
        {values.id ? "Save changes" : "Create collection"}
      </Button>
    </div>
  );
}
