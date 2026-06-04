import { describe, it, expect } from "vitest";
import { tierRank, tierLabel, wattBaseline } from "./psuModels";
import type { CalculationResult } from "./calculator";
import type { PsuStandard, Tier } from "@/types/components";

/** Minimal CalculationResult builder for the logic under test. */
function makeResult(over: Partial<CalculationResult>): CalculationResult {
  return {
    baseWatts: 0,
    totalWatts: 0,
    recommendedPsu: null,
    tier: null,
    breakdown: { rail12: 0, rail5: 0, rail3v3: 0, lines: [] },
    ...over,
  };
}

describe("tierRank", () => {
  it("ranks tier-s best (0) and worse tiers higher", () => {
    expect(tierRank("tier-s")).toBe(0);
    expect(tierRank("tier-a")).toBe(1);
    expect(tierRank("tier-f")).toBeGreaterThan(tierRank("tier-a"));
  });

  it("ranks an unknown tier id as worst", () => {
    expect(tierRank("tier-zzz")).toBeGreaterThan(tierRank("tier-f"));
  });
});

describe("tierLabel", () => {
  it("returns the human label for a known id", () => {
    expect(tierLabel("tier-b-plus")).toBe("Tier B+");
  });
  it("falls back to the raw id when unknown", () => {
    expect(tierLabel("tier-zzz")).toBe("tier-zzz");
  });
});

describe("wattBaseline", () => {
  it("uses the recommended PSU wattage when present", () => {
    const psu: PsuStandard = { w: 650, requires_220v: false };
    expect(wattBaseline(makeResult({ recommendedPsu: psu, totalWatts: 660 }))).toBe(650);
  });
  it("falls back to totalWatts when no standard covers the build", () => {
    expect(wattBaseline(makeResult({ recommendedPsu: null, totalWatts: 5600 }))).toBe(5600);
  });
});
