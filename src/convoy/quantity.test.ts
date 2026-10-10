import { describe, expect, it } from "vitest";
import { formatNumber, parseQuantity } from "./quantity.ts";

describe("parseQuantity", () => {
  it.each([
    ["1240000", 1_240_000],
    ["1 240 000", 1_240_000],
    ["1 240 000", 1_240_000],
    ["272k", 272_000],
    ["272K", 272_000],
    ["1,5m", 1_500_000],
    ["1.5M", 1_500_000],
    ["2g", 2_000_000_000],
    ["0", 0],
  ])("reads %s", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.240.000", "12x", "k"])("rejects %s", (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe("formatNumber", () => {
  it("groups thousands with spaces like the game", () => {
    expect(formatNumber(1_240_000)).toBe("1 240 000");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(0)).toBe("0");
  });
});
