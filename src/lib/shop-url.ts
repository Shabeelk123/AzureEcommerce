import type { ProductFilters, SortOption } from "@/lib/catalog";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const PRICE_BANDS = [
  { key: "0-80000", label: "Under ₹800", min: 0, max: 80000 },
  { key: "80000-120000", label: "₹800 – ₹1,200", min: 80000, max: 120000 },
  { key: "120000-", label: "₹1,200 & above", min: 120000, max: undefined },
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function csv(value: string | string[] | undefined): string[] {
  const v = first(value);
  return v ? v.split(",").filter(Boolean) : [];
}

export function parseFilters(
  searchParams: RawSearchParams,
  overrides: Partial<Pick<ProductFilters, "categorySlug" | "collectionSlug">> = {},
): ProductFilters {
  const priceBand = PRICE_BANDS.find((b) => b.key === first(searchParams.price));
  const page = Number(first(searchParams.page));

  return {
    ...overrides,
    colors: csv(searchParams.color),
    fabrics: csv(searchParams.fabric),
    minPricePaise: priceBand?.min,
    maxPricePaise: priceBand?.max,
    sort: (first(searchParams.sort) as SortOption | undefined) ?? "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Builds an href for `basePath` with `overrides` merged into the current params (page always reset). */
export function withParams(
  basePath: string,
  current: RawSearchParams,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const v = first(value);
    if (v) params.set(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  params.delete("page"); // any filter/sort change starts back at page 1
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Toggles `value` in a comma-separated multi-select param (color, fabric) and returns the new href. */
export function toggleListParamHref(
  basePath: string,
  current: RawSearchParams,
  paramName: "color" | "fabric",
  value: string,
): string {
  const existing = csv(current[paramName]);
  const next = existing.includes(value)
    ? existing.filter((v) => v !== value)
    : [...existing, value];
  return withParams(basePath, current, {
    [paramName]: next.length ? next.join(",") : undefined,
  });
}

export function isListParamActive(
  current: RawSearchParams,
  paramName: "color" | "fabric",
  value: string,
): boolean {
  return csv(current[paramName]).includes(value);
}

export function priceBands(basePath: string, current: RawSearchParams) {
  const active = first(current.price);
  return PRICE_BANDS.map((band) => ({
    ...band,
    active: active === band.key,
    href: withParams(basePath, current, {
      price: active === band.key ? undefined : band.key,
    }),
  }));
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export function sortHref(
  basePath: string,
  current: RawSearchParams,
  sort: SortOption,
): string {
  return withParams(basePath, current, { sort });
}

export function pageHref(
  basePath: string,
  current: RawSearchParams,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const v = first(value);
    if (v) params.set(key, v);
  }
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasActiveFilters(searchParams: RawSearchParams): boolean {
  return Boolean(
    first(searchParams.color) || first(searchParams.fabric) || first(searchParams.price),
  );
}
