"use server";

import { z } from "zod";
import { invalidateTag } from "@/lib/cache-tags";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import { updateSettings } from "@/lib/settings";

class SettingsActionError extends Error {}

const settingsInputSchema = z.object({
  shippingFlatPaise: z.number().int().min(0),
  freeShippingThresholdPaise: z.number().int().min(0),
  storeName: z.string().trim().min(1).max(120),
  supportEmail: z.email(),
  supportPhone: z.string().trim().max(20).optional(),
});

export const updateSettingsAction = actionClient
  .inputSchema(settingsInputSchema)
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "settings.update",
      entity: "Settings",
      errorClass: SettingsActionError,
      op: async () => {
        const settings = await updateSettings({
          ...parsedInput,
          supportPhone: parsedInput.supportPhone ?? null,
        });
        invalidateTag("settings");
        return settings;
      },
      entityId: () => "singleton",
      diff: () => parsedInput,
    });
    return { ok: true };
  });
