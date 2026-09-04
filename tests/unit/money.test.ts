import { describe, expect, it } from "vitest";
import {
  applyPercentDiscount,
  formatINR,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from "@/lib/money";

describe("money", () => {
  it("formats paise as INR", () => {
    expect(formatINR(1234550)).toBe("₹12,345.50");
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(100)).toBe("₹1.00");
  });

  it("rejects non-integer paise in formatINR", () => {
    expect(() => formatINR(10.5)).toThrow(TypeError);
  });

  it("converts rupees to paise", () => {
    expect(rupeesToPaise(499)).toBe(49900);
    expect(rupeesToPaise(499.99)).toBe(49999);
    // Rounds to the nearest paisa rather than truncating.
    expect(rupeesToPaise(10.005)).toBe(1001);
  });

  it("converts paise to rupees", () => {
    expect(paiseToRupees(49900)).toBe(499);
    expect(paiseToRupees(50)).toBe(0.5);
  });

  it("round-trips rupees -> paise -> rupees", () => {
    expect(paiseToRupees(rupeesToPaise(999))).toBe(999);
  });

  it("sums a list of paise amounts", () => {
    expect(sumPaise([100, 200, 300])).toBe(600);
    expect(sumPaise([])).toBe(0);
  });

  it("rejects non-integer amounts in sumPaise", () => {
    expect(() => sumPaise([100, 10.5])).toThrow(TypeError);
  });

  it("applies a percent discount, rounded down", () => {
    expect(applyPercentDiscount(10000, 10)).toBe(1000);
    // 33% of 999 = 329.67 -> floors to 329.
    expect(applyPercentDiscount(999, 33)).toBe(329);
    expect(applyPercentDiscount(10000, 0)).toBe(0);
    expect(applyPercentDiscount(10000, 100)).toBe(10000);
  });

  it("rejects out-of-range percentages", () => {
    expect(() => applyPercentDiscount(1000, -1)).toThrow(RangeError);
    expect(() => applyPercentDiscount(1000, 101)).toThrow(RangeError);
  });
});
