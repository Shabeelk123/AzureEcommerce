"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import {
  CollectionActionError,
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/lib/admin/collection";

const collectionInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
  name: z.string().trim().min(1).max(120),
  heroImage: z.string().trim().url().optional(),
  isFeatured: z.boolean().default(false),
});

export const createCollectionAction = actionClient
  .inputSchema(collectionInputSchema)
  .action(async ({ parsedInput }) => {
    const collection = await runAdminOp({
      action: "collection.create",
      entity: "Collection",
      errorClass: CollectionActionError,
      op: () => createCollection(parsedInput),
      entityId: (c) => c.id,
      diff: () => parsedInput,
    });
    return { ok: true, id: collection.id };
  });

export const updateCollectionAction = actionClient
  .inputSchema(collectionInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id, ...input } }) => {
    await runAdminOp({
      action: "collection.update",
      entity: "Collection",
      errorClass: CollectionActionError,
      op: () => updateCollection(id, input),
      entityId: () => id,
      diff: () => input,
    });
    return { ok: true };
  });

export const deleteCollectionAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "collection.delete",
      entity: "Collection",
      errorClass: CollectionActionError,
      op: () => deleteCollection(parsedInput.id),
      entityId: () => parsedInput.id,
    });
    return { ok: true };
  });
