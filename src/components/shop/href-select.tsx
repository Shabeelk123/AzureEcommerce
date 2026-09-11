"use client";

import { useRouter } from "next/navigation";

// Thin client wrapper: the actual URL for each option is computed
// server-side by src/lib/shop-url.ts (real filter/sort state lives in the
// URL, same as every other filter control on this page) — this component
// only translates a <select>'s onChange into a navigation.
export function HrefSelect({
  value,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
  className?: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => {
        const option = options.find((o) => o.value === e.target.value);
        if (option) router.push(option.href);
      }}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
