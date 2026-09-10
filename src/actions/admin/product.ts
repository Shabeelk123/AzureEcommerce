"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { runAdminOp } from "@/lib/admin/guard";
import {
  ProductActionError,
  addProductImage,
  createProduct,
  createVariant,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  reorderProductImages,
  updateProduct,
  updateVariant,
} from "@/lib/admin/product";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only.");

const productInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  categoryId: z.string().min(1),
  collectionIds: z.array(z.string().min(1)).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  fabric: z.string().trim().min(1).max(120),
  careInstructions: z.string().trim().max(2000).optional(),
  basePricePaise: z.number().int().positive(),
  compareAtPaise: z.number().int().positive().optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(500).optional(),
});

export const createProductAction = actionClient
  .inputSchema(productInputSchema)
  .action(async ({ parsedInput }) => {
    const product = await runAdminOp({
      action: "product.create",
      entity: "Product",
      errorClass: ProductActionError,
      op: () =>
        createProduct({
          ...parsedInput,
          careInstructions: parsedInput.careInstructions ?? null,
          compareAtPaise: parsedInput.compareAtPaise ?? null,
          seoTitle: parsedInput.seoTitle ?? null,
          seoDescription: parsedInput.seoDescription ?? null,
        }),
      entityId: (p) => p.id,
      diff: () => ({ title: parsedInput.title, status: parsedInput.status }),
    });
    return { ok: true, id: product.id };
  });

export const updateProductAction = actionClient
  .inputSchema(productInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id, ...input } }) => {
    await runAdminOp({
      action: "product.update",
      entity: "Product",
      errorClass: ProductActionError,
      op: () =>
        updateProduct(id, {
          ...input,
          careInstructions: input.careInstructions ?? null,
          compareAtPaise: input.compareAtPaise ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
        }),
      entityId: () => id,
      diff: () => ({ title: input.title, status: input.status }),
    });
    return { ok: true };
  });

export const deleteProductAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "product.delete",
      entity: "Product",
      errorClass: ProductActionError,
      op: () => deleteProduct(parsedInput.id),
      entityId: () => parsedInput.id,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export const addProductImageAction = actionClient
  .inputSchema(
    z.object({
      productId: z.string().min(1),
      url: z.string().url(),
      alt: z.string().trim().min(1).max(200),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const image = await runAdminOp({
      action: "product.image.add",
      entity: "Product",
      errorClass: ProductActionError,
      op: () => addProductImage(parsedInput),
      entityId: () => parsedInput.productId,
    });
    return { ok: true, id: image.id };
  });

export const deleteProductImageAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1), productId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "product.image.delete",
      entity: "Product",
      errorClass: ProductActionError,
      op: () => deleteProductImage(parsedInput.id),
      entityId: () => parsedInput.productId,
    });
    return { ok: true };
  });

export const reorderProductImagesAction = actionClient
  .inputSchema(z.object({ productId: z.string().min(1), orderedIds: z.array(z.string().min(1)) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "product.image.reorder",
      entity: "Product",
      errorClass: ProductActionError,
      op: () => reorderProductImages(parsedInput.productId, parsedInput.orderedIds),
      entityId: () => parsedInput.productId,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const variantInputSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  colorName: z.string().trim().min(1).max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #1a2b3c"),
  size: z.string().trim().max(20).optional(),
  length: z.string().trim().max(20).optional(),
  pricePaise: z.number().int().positive().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weightGrams: z.number().int().positive().default(100),
  isActive: z.boolean().default(true),
});

export const createVariantAction = actionClient
  .inputSchema(variantInputSchema.extend({ productId: z.string().min(1) }))
  .action(async ({ parsedInput: { productId, ...input } }) => {
    const variant = await runAdminOp({
      action: "product.variant.create",
      entity: "Product",
      errorClass: ProductActionError,
      op: () =>
        createVariant(productId, {
          ...input,
          size: input.size ?? null,
          length: input.length ?? null,
          pricePaise: input.pricePaise ?? null,
        }),
      entityId: () => productId,
      diff: () => ({ sku: input.sku }),
    });
    return { ok: true, id: variant.id };
  });

export const updateVariantAction = actionClient
  .inputSchema(variantInputSchema.extend({ id: z.string().min(1), productId: z.string().min(1) }))
  .action(async ({ parsedInput: { id, productId, ...input } }) => {
    await runAdminOp({
      action: "product.variant.update",
      entity: "Product",
      errorClass: ProductActionError,
      op: () =>
        updateVariant(id, {
          ...input,
          size: input.size ?? null,
          length: input.length ?? null,
          pricePaise: input.pricePaise ?? null,
        }),
      entityId: () => productId,
      diff: () => ({ sku: input.sku }),
    });
    return { ok: true };
  });

export const deleteVariantAction = actionClient
  .inputSchema(z.object({ id: z.string().min(1), productId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await runAdminOp({
      action: "product.variant.delete",
      entity: "Product",
      errorClass: ProductActionError,
      op: () => deleteVariant(parsedInput.id),
      entityId: () => parsedInput.productId,
    });
    return { ok: true };
  });
