"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionClient, ActionError } from "@/lib/safe-action";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toggleWishlistItem } from "@/lib/wishlist";

export const toggleWishlistAction = actionClient
  .inputSchema(z.object({ productId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    // getCurrentUser() (nullable), not requireUser() (redirects) — a
    // logged-out click on a heart icon should surface as a friendly
    // toast telling the shopper to log in, not silently navigate them
    // away from whatever they were looking at.
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Log in to save items to your wishlist.");

    const result = await toggleWishlistItem(user.id, parsedInput.productId);
    revalidatePath("/account/wishlist");
    return result;
  });
