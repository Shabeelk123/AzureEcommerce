"use server";

import { z } from "zod";
import { actionClient, ActionError } from "@/lib/safe-action";
import { requireAdmin } from "@/lib/auth/current-user";
import { StorageError, createPresignedUploadUrl } from "@/lib/storage";

// Signing a URL isn't itself a mutation worth an audit-log row — the
// audit-worthy event is addProductImageAction, once the resulting URL is
// actually attached to a product.
export const createPresignedUploadUrlAction = actionClient
  .inputSchema(
    z.object({
      contentType: z.string().min(1),
      folder: z.enum(["products", "categories", "collections"]),
    }),
  )
  .action(async ({ parsedInput }) => {
    await requireAdmin();
    try {
      return await createPresignedUploadUrl(parsedInput);
    } catch (error) {
      if (error instanceof StorageError) throw new ActionError(error.message);
      throw error;
    }
  });
