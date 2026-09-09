/**
 * All money in this codebase is an integer count of paise (1/100 INR),
 * exactly what Razorpay's API also speaks. Never store or compute money as
 * a float/Number of rupees — that is how a store loses (or overcharges)
 * fractions of a rupee at scale. This file is the only place that divides
 * by 100.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Format paise as a localized INR string, e.g. `1234550` -> "₹12,345.50". */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`formatINR expects an integer paise value, got ${paise}`);
  }
  return INR_FORMATTER.format(paise / 100);
}

/** Convert a rupee amount (e.g. from an admin form) to integer paise. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new TypeError(`rupeesToPaise expects a finite number, got ${rupees}`);
  }
  return Math.round(rupees * 100);
}

/** Convert integer paise to a rupee number, for display-only arithmetic. */
export function paiseToRupees(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`paiseToRupees expects an integer paise value, got ${paise}`);
  }
  return paise / 100;
}

/** Sum a list of paise amounts, guarding against non-integer inputs. */
export function sumPaise(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => {
    if (!Number.isInteger(amount)) {
      throw new TypeError(`sumPaise expects integer paise values, got ${amount}`);
    }
    return total + amount;
  }, 0);
}

/** Apply a percentage (0-100) discount to a paise amount, rounded down. */
export function applyPercentDiscount(amountPaise: number, percent: number): number {
  if (percent < 0 || percent > 100) {
    throw new RangeError(`percent must be between 0 and 100, got ${percent}`);
  }
  return Math.floor((amountPaise * percent) / 100);
}

/**
 * A variant's effective price: its own override if set, else the parent
 * product's base price. This one rule is duplicated across the product
 * card, variant selector, and cart — centralized here so it can't drift.
 */
export function resolveVariantPricePaise(
  variant: { pricePaise: number | null },
  product: { basePricePaise: number },
): number {
  return variant.pricePaise ?? product.basePricePaise;
}
