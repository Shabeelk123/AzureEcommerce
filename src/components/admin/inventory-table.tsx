"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { bulkUpdateStockAction } from "@/actions/admin/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VariantRow = {
  id: string;
  sku: string;
  colorName: string;
  size: string | null;
  stock: number;
  lowStockThreshold: number;
  product: { title: string; slug: string };
};

export function InventoryTable({ variants }: { variants: VariantRow[] }) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const action = useAction(bulkUpdateStockAction, {
    onSuccess: () => {
      toast.success(`Updated stock for ${Object.keys(edits).length} variant(s).`);
      setEdits({});
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update stock."),
  });

  const dirtyCount = useMemo(() => Object.keys(edits).length, [edits]);

  function setStock(variantId: string, value: string) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setEdits((prev) => ({ ...prev, [variantId]: Math.max(0, Math.round(parsed)) }));
  }

  function submit() {
    action.execute({
      updates: Object.entries(edits).map(([variantId, stock]) => ({ variantId, stock })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Variant</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.map((variant) => {
              const isLow = (edits[variant.id] ?? variant.stock) <= variant.lowStockThreshold;
              return (
                <tr key={variant.id} className={isLow ? "bg-amber-50" : "hover:bg-stone-50"}>
                  <td className="px-4 py-2">{variant.product.title}</td>
                  <td className="px-4 py-2 text-stone-500">
                    {variant.colorName}
                    {variant.size ? ` / ${variant.size}` : ""}
                  </td>
                  <td className="px-4 py-2 text-stone-500">{variant.sku}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      className="w-24"
                      value={edits[variant.id] ?? variant.stock}
                      onChange={(e) => setStock(variant.id, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
            {variants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No variants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {dirtyCount > 0 && (
        <Button onClick={submit} disabled={action.isExecuting}>
          Save {dirtyCount} change{dirtyCount === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}
