"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import { InventoryActionError, bulkUpdateStock } from "@/lib/admin/inventory";

export const bulkUpdateStockAction = actionClient
  .inputSchema(
    z.object({
      updates: z
        .array(z.object({ variantId: z.string().min(1), stock: z.number().int().min(0) }))
        .min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "inventory.bulk_update",
      entity: "ProductVariant",
      errorClass: InventoryActionError,
      op: () => bulkUpdateStock(parsedInput.updates),
      entityId: () => `${parsedInput.updates.length} variants`,
      diff: () => ({ count: parsedInput.updates.length }),
    });
    return { ok: true };
  });
