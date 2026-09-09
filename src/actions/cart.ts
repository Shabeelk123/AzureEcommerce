"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionClient, ActionError } from "@/lib/safe-action";
import { CartError, addItem, removeItem, updateItemQuantity } from "@/lib/cart";

// Cart pages/badges read `cookies()` directly (see src/lib/cart.ts), so
// they're never part of the `"use cache"` static shell — a plain
// `revalidatePath` after each mutation is enough to refresh them; there's
// no cache entry to invalidate with revalidateTag here.
async function refreshCartViews() {
  revalidatePath("/cart");
  revalidatePath("/", "layout"); // header cart badge, present on every page
}

/** Business-logic errors (`CartError`) become friendly `ActionError`s; anything else is generic. */
async function runCartOp(op: () => Promise<void>): Promise<void> {
  try {
    await op();
  } catch (error) {
    if (error instanceof CartError) throw new ActionError(error.message);
    throw error;
  }
}

export const addToCart = actionClient
  .inputSchema(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .action(async ({ parsedInput: { variantId, quantity } }) => {
    await runCartOp(() => addItem(variantId, quantity));
    await refreshCartViews();
    return { ok: true };
  });

export const updateCartItemQuantity = actionClient
  .inputSchema(
    z.object({
      cartItemId: z.string().min(1),
      quantity: z.number().int().min(0).max(20),
    }),
  )
  .action(async ({ parsedInput: { cartItemId, quantity } }) => {
    await runCartOp(() => updateItemQuantity(cartItemId, quantity));
    await refreshCartViews();
    return { ok: true };
  });

export const removeCartItem = actionClient
  .inputSchema(z.object({ cartItemId: z.string().min(1) }))
  .action(async ({ parsedInput: { cartItemId } }) => {
    await removeItem(cartItemId);
    await refreshCartViews();
    return { ok: true };
  });
