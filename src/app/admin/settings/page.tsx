import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current-user";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Store settings" };

async function SettingsContent() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Store settings</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-lg" />}>
      <SettingsContent />
    </Suspense>
  );
}
