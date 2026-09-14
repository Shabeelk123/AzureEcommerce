"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createVariantAction, deleteVariantAction, updateVariantAction } from "@/actions/admin/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";

type Variant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  length: string | null;
  pricePaise: number | null;
  stock: number;
  lowStockThreshold: number;
  weightGrams: number;
  isActive: boolean;
};

const emptyDraft = {
  sku: "",
  colorName: "",
  // Neutral gray, not black — this is a fallback for admins who don't
  // bother picking an exact swatch (color name is the field that
  // actually matters; see the "optional" label below).
  colorHex: "#9ca3af",
  size: "",
  length: "",
  pricePaise: "",
  stock: "0",
  lowStockThreshold: "5",
  weightGrams: "100",
  isActive: true,
};

type ExistingColor = { colorName: string; colorHex: string };

export function ProductVariantsPanel({
  productId,
  variants,
  existingColors,
}: {
  productId: string;
  variants: Variant[];
  existingColors: ExistingColor[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const createAction = useAction(createVariantAction, {
    onSuccess: () => {
      toast.success("Variant added.");
      setDraft(emptyDraft);
      setShowForm(false);
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't add variant."),
  });
  const deleteAction = useAction(deleteVariantAction, {
    onSuccess: () => {
      toast.success("Variant removed.");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't remove variant."),
  });
  const toggleActiveAction = useAction(updateVariantAction, {
    onSuccess: () => router.refresh(),
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update variant."),
  });

  function submitDraft() {
    createAction.execute({
      productId,
      sku: draft.sku.trim(),
      colorName: draft.colorName.trim(),
      colorHex: draft.colorHex,
      size: draft.size.trim() || undefined,
      length: draft.length.trim() || undefined,
      pricePaise: draft.pricePaise ? Math.round(Number(draft.pricePaise) * 100) : undefined,
      stock: Number(draft.stock),
      lowStockThreshold: Number(draft.lowStockThreshold),
      weightGrams: Number(draft.weightGrams),
      isActive: draft.isActive,
    });
  }

  function toggleActive(variant: Variant) {
    toggleActiveAction.execute({
      id: variant.id,
      productId,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      size: variant.size ?? undefined,
      length: variant.length ?? undefined,
      pricePaise: variant.pricePaise ?? undefined,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      weightGrams: variant.weightGrams,
      isActive: !variant.isActive,
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Variants</h2>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add variant"}
        </Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-4">
          <Input placeholder="SKU" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
          <div className="space-y-1">
            {existingColors.length > 0 && (
              <select
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs shadow-xs"
                value=""
                onChange={(e) => {
                  const match = existingColors.find((c) => c.colorName === e.target.value);
                  if (match) setDraft({ ...draft, colorName: match.colorName, colorHex: match.colorHex });
                }}
              >
                <option value="">Use an existing color…</option>
                {existingColors.map((c) => (
                  <option key={c.colorName} value={c.colorName}>
                    {c.colorName}
                  </option>
                ))}
              </select>
            )}
            <Input
              placeholder="Color name (e.g. Dusty Rose)"
              value={draft.colorName}
              onChange={(e) => setDraft({ ...draft, colorName: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="color"
              className="h-9 w-12 shrink-0 p-1"
              value={draft.colorHex}
              onChange={(e) => setDraft({ ...draft, colorHex: e.target.value })}
            />
            <span className="text-[11px] text-stone-500">Swatch (optional)</span>
          </div>
          <Input placeholder="Size (optional)" value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} />
          <Input
            placeholder="Length (optional)"
            value={draft.length}
            onChange={(e) => setDraft({ ...draft, length: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Price override ₹ (optional)"
            value={draft.pricePaise}
            onChange={(e) => setDraft({ ...draft, pricePaise: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Stock"
            value={draft.stock}
            onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Low stock threshold"
            value={draft.lowStockThreshold}
            onChange={(e) => setDraft({ ...draft, lowStockThreshold: e.target.value })}
          />
          <Button
            size="sm"
            disabled={!draft.sku || !draft.colorName || createAction.isExecuting}
            onClick={submitDraft}
            className="col-span-2"
          >
            Save variant
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Color</th>
              <th className="py-1 pr-3">Size</th>
              <th className="py-1 pr-3">Price override</th>
              <th className="py-1 pr-3">Stock</th>
              <th className="py-1 pr-3">Active</th>
              <th className="py-1 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td className="py-2 pr-3">{variant.sku}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: variant.colorHex }}
                    />
                    {variant.colorName}
                  </span>
                </td>
                <td className="py-2 pr-3">{variant.size ?? "—"}</td>
                <td className="py-2 pr-3">{variant.pricePaise ? formatINR(variant.pricePaise) : "—"}</td>
                <td className="py-2 pr-3">
                  <span className={variant.stock <= variant.lowStockThreshold ? "text-amber-700" : ""}>
                    {variant.stock}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <button
                    className="text-xs text-stone-500 underline"
                    onClick={() => toggleActive(variant)}
                    disabled={toggleActiveAction.isExecuting}
                  >
                    {variant.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="py-2 pr-3">
                  <button
                    className="text-xs text-red-600 underline"
                    onClick={() => deleteAction.execute({ id: variant.id, productId })}
                    disabled={deleteAction.isExecuting}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-stone-500">
                  No variants yet — add at least one to make this product purchasable.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
