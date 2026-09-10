import "server-only";
import { cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export type StoreSettings = Awaited<ReturnType<typeof getSettingsUncached>>;

async function getSettingsUncached() {
  // upsert rather than findUniqueOrThrow: the singleton row is created by
  // the Phase 7 migration's default values on first read if it's somehow
  // missing (e.g. a fresh DB seeded before this migration ran), so callers
  // never have to null-check a settings object that must always exist.
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function getSettings() {
  "use cache";
  cacheTag("settings");
  return getSettingsUncached();
}

export type UpdateSettingsInput = {
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number;
  storeName: string;
  supportEmail: string;
  supportPhone?: string | null;
};

export async function updateSettings(input: UpdateSettingsInput) {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: input,
    create: { id: SETTINGS_ID, ...input },
  });
}
