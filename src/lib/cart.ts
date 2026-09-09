import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveVariantPricePaise, sumPaise } from "@/lib/money";

const CART_COOKIE = "azh_cart";
const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function getCartCookie(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

async function setCartCookie(token: string, expiresAt: Date) {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function clearCartCookie() {
  (await cookies()).set(CART_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Reads the current cart's identity (row id) without creating anything —
 * used by read paths (header badge, cart page) so an anonymous visitor who
 * never adds an item never gets an empty Cart row and cookie for nothing.
 */
async function findActiveCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await prisma.cart.findFirst({ where: { userId: user.id } });
    return cart?.id ?? null;
  }
  const token = await getCartCookie();
  if (!token) return null;
  const cart = await prisma.cart.findUnique({ where: { sessionToken: token } });
  return cart?.id ?? null;
}

/** Same as above, but creates a cart (and, for guests, the cookie) if none exists yet. */
async function getOrCreateActiveCartId(): Promise<string> {
  const user = await getCurrentUser();
  const expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);

  if (user) {
    const existing = await prisma.cart.findFirst({ where: { userId: user.id } });
    if (existing) return existing.id;
    const cart = await prisma.cart.create({ data: { userId: user.id, expiresAt } });
    return cart.id;
  }

  const token = await getCartCookie();
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { sessionToken: token } });
    if (existing) return existing.id;
  }

  const newToken = randomBytes(24).toString("base64url");
  const cart = await prisma.cart.create({ data: { sessionToken: newToken, expiresAt } });
  await setCartCookie(newToken, expiresAt);
  return cart.id;
}

export class CartError extends Error {}

export async function addItem(variantId: string, quantity: number): Promise<void> {
  if (quantity < 1) throw new CartError("Quantity must be at least 1.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
    throw new CartError("This item is no longer available.");
  }
  if (variant.stock === 0) {
    throw new CartError("This item is out of stock.");
  }

  const cartId = await getOrCreateActiveCartId();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
  });

  // See the note above `addItem` on why this isn't wrapped in a
  // serializable transaction: the cap here is a courtesy, not the
  // authority — getCartWithDetails re-checks stock on every read, and
  // Phase 5's order placement re-checks (and atomically decrements) it
  // again for real. Worst case of the small race window here is a cart
  // that briefly shows one more unit than truly available, caught on the
  // very next read.
  const requestedTotal = (existing?.quantity ?? 0) + quantity;
  const cappedTotal = Math.min(requestedTotal, variant.stock);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    update: { quantity: cappedTotal },
    create: { cartId, variantId, quantity: cappedTotal },
  });

  if (cappedTotal < requestedTotal) {
    throw new CartError(`Only ${variant.stock} left in stock — added what's available.`);
  }
}

export async function updateItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity < 0) throw new CartError("Quantity can't be negative.");

  const cartId = await findActiveCartId();
  if (!cartId) throw new CartError("Your cart could not be found.");

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId },
    include: { variant: true },
  });
  if (!item) throw new CartError("This item is no longer in your cart.");

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return;
  }

  const capped = Math.min(quantity, item.variant.stock);
  await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: capped } });
  if (capped < quantity) {
    throw new CartError(`Only ${item.variant.stock} left in stock.`);
  }
}

export async function removeItem(cartItemId: string): Promise<void> {
  const cartId = await findActiveCartId();
  if (!cartId) return;
  await prisma.cartItem.deleteMany({ where: { id: cartItemId, cartId } });
}

export type CartLine = {
  id: string;
  variantId: string;
  sku: string;
  productSlug: string;
  productTitle: string;
  variantLabel: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  availableStock: number;
  effectiveQuantity: number;
  hasStockIssue: boolean;
  linePaise: number;
};

export type CartSummary = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalPaise: number;
  hasIssues: boolean;
};

const EMPTY_CART: CartSummary = {
  id: null,
  lines: [],
  itemCount: 0,
  subtotalPaise: 0,
  hasIssues: false,
};

/**
 * The read path every cart UI uses. Deliberately uncached (reads cookies()
 * / the current user, and stock must always be current) — re-validates
 * each line's stock against the live ProductVariant row rather than
 * trusting the quantity stored on the cart item.
 */
export async function getCart(): Promise<CartSummary> {
  const cartId = await findActiveCartId();
  if (!cartId) return EMPTY_CART;

  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      variant: { include: { product: { include: { images: { take: 1 } } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines: CartLine[] = items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const effectiveQuantity = Math.min(item.quantity, variant.stock);
    const unitPricePaise = resolveVariantPricePaise(variant, product);
    return {
      id: item.id,
      variantId: variant.id,
      sku: variant.sku,
      productSlug: product.slug,
      productTitle: product.title,
      variantLabel: [variant.colorName, variant.size].filter(Boolean).join(" / "),
      imageUrl: product.images[0]?.url ?? null,
      unitPricePaise,
      quantity: item.quantity,
      availableStock: variant.stock,
      effectiveQuantity,
      hasStockIssue: effectiveQuantity < item.quantity,
      linePaise: unitPricePaise * effectiveQuantity,
    };
  });

  return {
    id: cartId,
    lines,
    itemCount: lines.reduce((n, l) => n + l.effectiveQuantity, 0),
    subtotalPaise: sumPaise(lines.map((l) => l.linePaise)),
    hasIssues: lines.some((l) => l.hasStockIssue),
  };
}

/** Lightweight count for the header badge — avoids the full join + stock re-check. */
export async function getCartItemCount(): Promise<number> {
  const cartId = await findActiveCartId();
  if (!cartId) return 0;
  const result = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/**
 * Called right after a guest with an active cart logs in or signs up.
 * Merges guest cart lines into the user's cart (summing quantities, capped
 * at stock) and discards the guest cart + cookie. Never loses items
 * silently: if a variant is already in both carts, quantities add up
 * exactly like adding it twice would.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const guestToken = await getCartCookie();
  if (!guestToken) return;

  const guestCart = await prisma.cart.findUnique({
    where: { sessionToken: guestToken },
    include: { items: { include: { variant: true } } },
  });
  if (!guestCart) {
    await clearCartCookie();
    return;
  }

  await prisma.$transaction(async (tx) => {
    let userCart = await tx.cart.findFirst({ where: { userId } });
    if (!userCart) {
      userCart = await tx.cart.create({
        data: { userId, expiresAt: new Date(Date.now() + GUEST_CART_TTL_MS) },
      });
    }

    for (const guestItem of guestCart.items) {
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: userCart.id, variantId: guestItem.variantId },
        },
      });
      const total = (existing?.quantity ?? 0) + guestItem.quantity;
      const capped = Math.min(total, guestItem.variant.stock);
      if (capped <= 0) continue;

      await tx.cartItem.upsert({
        where: {
          cartId_variantId: { cartId: userCart.id, variantId: guestItem.variantId },
        },
        update: { quantity: capped },
        create: { cartId: userCart.id, variantId: guestItem.variantId, quantity: capped },
      });
    }

    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  await clearCartCookie();
}
