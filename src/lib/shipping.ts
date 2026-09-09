/**
 * Hardcoded for now — Phase 7's admin panel adds a Settings table for
 * shipping rate / free-shipping threshold. Keeping the lookup behind a
 * function (rather than importing these constants directly at call
 * sites) means swapping this for a DB-backed settings read later is a
 * one-function change, not a search-and-replace across the codebase.
 */
const FLAT_SHIPPING_PAISE = 7900; // ₹79
const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999

export function calculateShippingPaise(subtotalPaise: number): number {
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : FLAT_SHIPPING_PAISE;
}

export { FREE_SHIPPING_THRESHOLD_PAISE };
