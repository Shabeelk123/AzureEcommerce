import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { listVariantsForInventory } from "@/lib/admin/inventory";
import { InventoryTable } from "@/components/admin/inventory-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Inventory" };

type Props = { searchParams: Promise<{ q?: string; low?: string }> };

async function InventoryContent({ searchParams }: Props) {
  await requireAdmin();
  const { q, low } = await searchParams;
  const variants = await listVariantsForInventory({ search: q, lowStockOnly: low === "1" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Inventory</h1>
      <form className="flex flex-wrap items-center gap-2">
        <Input name="q" placeholder="Search by SKU or product" defaultValue={q} className="max-w-sm" />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="low" value="1" defaultChecked={low === "1"} />
          Low stock only
        </label>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>
      <InventoryTable variants={variants} />
    </div>
  );
}

export default function AdminInventoryPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InventoryContent searchParams={searchParams} />
    </Suspense>
  );
}
