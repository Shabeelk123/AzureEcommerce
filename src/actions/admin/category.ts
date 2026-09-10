"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import { CategoryActionError, createCategory, deleteCategory, updateCategory } from "@/lib/admin/category";

const categoryInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  image: z.string().trim().url().optional(),
  sortOrder: z.number().int().default(0),
});

export const createCategoryAction = actionClient
  .inputSchema(categoryInputSchema)
  .action(async ({ parsedInput }) => {
    const category = await runAdminOp({
      action: "category.create",
      entity: "Category",
      errorClass: CategoryActionError,
      op: () => createCategory(parsedInput),
      entityId: (c) => c.id,
      diff: () => parsedInput,
    });
    return { ok: true, id: category.id };
  });

export const updateCategoryAction = actionClient
  .inputSchema(categoryInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id, ...input } }) => {
    await runAdminOp({
      action: "category.update",
      entity: "Category",
      errorClass: CategoryActionError,
      op: () => updateCategory(id, input),
      entityId: () => id,
      diff: () => input,
    });
    return { ok: true };
  });

export const deleteCategoryAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "category.delete",
      entity: "Category",
      errorClass: CategoryActionError,
      op: () => deleteCategory(parsedInput.id),
      entityId: () => parsedInput.id,
    });
    return { ok: true };
  });
