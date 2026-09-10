"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import Image from "next/image";
import { createPresignedUploadUrlAction } from "@/actions/admin/storage";
import { addProductImageAction, deleteProductImageAction } from "@/actions/admin/product";
import { Button } from "@/components/ui/button";

type ProductImage = { id: string; url: string; alt: string; width: number; height: number };

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read image dimensions."));
    };
    img.src = objectUrl;
  });
}

export function ProductImagesPanel({ productId, images }: { productId: string; images: ProductImage[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const presignAction = useAction(createPresignedUploadUrlAction);
  const addImageAction = useAction(addProductImageAction, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't save image."),
  });
  const deleteImageAction = useAction(deleteProductImageAction, {
    onSuccess: () => {
      toast.success("Image removed.");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't remove image."),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const [dimensions, presignResult] = await Promise.all([
        readImageDimensions(file),
        presignAction.executeAsync({ contentType: file.type, folder: "products" }),
      ]);
      const presigned = presignResult?.data;
      if (!presigned) throw new Error(presignResult?.serverError ?? "Couldn't get an upload URL.");

      // The file's bytes go straight from this browser to R2 via the
      // presigned PUT URL — our server only ever signs the URL and later
      // records the resulting public URL, never touching the image itself.
      const putResponse = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResponse.ok) throw new Error("Upload to storage failed.");

      await addImageAction.executeAsync({
        productId,
        url: presigned.publicUrl,
        alt: file.name.replace(/\.[^.]+$/, ""),
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Images</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? "Uploading…" : "Upload image"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="group relative overflow-hidden rounded-md border">
            <Image
              src={image.url}
              alt={image.alt}
              width={200}
              height={200}
              className="aspect-square w-full object-cover"
            />
            <button
              className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600 opacity-0 group-hover:opacity-100"
              onClick={() => deleteImageAction.execute({ id: image.id, productId })}
              disabled={deleteImageAction.isExecuting}
            >
              Remove
            </button>
          </div>
        ))}
        {images.length === 0 && <p className="col-span-full text-sm text-stone-500">No images yet.</p>}
      </div>
    </div>
  );
}
