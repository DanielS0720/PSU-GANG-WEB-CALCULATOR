import { describe, it, expect } from "vitest";
import { tierRank, tierLabel, wattBaseline, checkPsuAdequacy, featuredPsus } from "./psuModels";
import type { CalculationResult } from "./calculator";
import type { PsuModel, PsuStandard, Tier } from "@/types/components";

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

const tierATier: Tier = {
  id: "tier-a",
  label: "Tier A",
  image: "/tiers/tier-a.png",
  max_cpu_w: null,
  max_gpu_w: null,
};

function model(over: Partial<PsuModel>): PsuModel {
  return { id: "x", brand: "B", model: "M", w: 850, tier: "tier-a", image: null, ...over };
}

describe("checkPsuAdequacy", () => {
  const result = makeResult({
    tier: tierATier,
    recommendedPsu: { w: 650, requires_220v: false },
    totalWatts: 660,
  });

  it("passes when tier is equal-or-better and watts cover the baseline", () => {
    expect(checkPsuAdequacy(model({ tier: "tier-s", w: 650 }), result)).toEqual({
      tierOk: true,
      wattsOk: true,
    });
  });

  it("flags an insufficient quality tier", () => {
    expect(checkPsuAdequacy(model({ tier: "tier-c", w: 850 }), result)).toEqual({
      tierOk: false,
      wattsOk: true,
    });
  });

  it("flags insufficient watts (below the recommended step)", () => {
    expect(checkPsuAdequacy(model({ tier: "tier-a", w: 600 }), result)).toEqual({
      tierOk: true,
      wattsOk: false,
    });
  });

  it("accepts watts exactly at the recommended step (660 build, 650 step, 650 PSU)", () => {
    expect(checkPsuAdequacy(model({ tier: "tier-a", w: 650 }), result).wattsOk).toBe(true);
  });

  it("can fail both checks at once", () => {
    expect(checkPsuAdequacy(model({ tier: "tier-f", w: 400 }), result)).toEqual({
      tierOk: false,
      wattsOk: false,
    });
  });

  it("treats a null build tier as permissive (any PSU tier passes)", () => {
    const noTier = makeResult({
      tier: null,
      recommendedPsu: { w: 650, requires_220v: false },
      totalWatts: 600,
    });
    expect(checkPsuAdequacy(model({ tier: "tier-f" }), noTier).tierOk).toBe(true);
  });
});

describe("featuredPsus", () => {
  const result = makeResult({
    tier: tierATier, // required rank = tier-a
    recommendedPsu: { w: 650, requires_220v: false }, // baseline 650
    totalWatts: 660,
  });

  const models: PsuModel[] = [
    model({ id: "too-weak-watts", tier: "tier-s", w: 600 }),       // excluded: < 650
    model({ id: "too-weak-tier", tier: "tier-c", w: 850 }),        // excluded: worse than tier-a
    model({ id: "plain-700", tier: "tier-a", w: 700 }),            // compatible, dist 50
    model({ id: "plain-650", tier: "tier-s", w: 650 }),            // compatible, dist 0
    model({ id: "plain-900", tier: "tier-a", w: 900 }),            // compatible, dist 250
    model({ id: "sponsor-800", tier: "tier-a", w: 800, sponsorRank: 1 }), // sponsored
  ];

  it("returns only compatible models", () => {
    const ids = featuredPsus(result, models).map((m) => m.id);
    expect(ids).not.toContain("too-weak-watts");
    expect(ids).not.toContain("too-weak-tier");
  });

  it("lists sponsored first, then closest wattage to the baseline", () => {
    expect(featuredPsus(result, models).map((m) => m.id)).toEqual([
      "sponsor-800", // sponsored wins regardless of distance
      "plain-650",   // dist 0
      "plain-700",   // dist 50
      "plain-900",   // dist 250
    ]);
  });

  it("honors the limit", () => {
    expect(featuredPsus(result, models, 2).map((m) => m.id)).toEqual([
      "sponsor-800",
      "plain-650",
    ]);
  });

  it("returns [] when the build has no tier (even if models would otherwise be compatible)", () => {
    const noTier = makeResult({
      tier: null,
      recommendedPsu: { w: 650, requires_220v: false },
      totalWatts: 660,
    });
    expect(featuredPsus(noTier, models)).toEqual([]);
  });

  it("returns [] when nothing is compatible", () => {
    const tiny = [model({ id: "tiny", tier: "tier-f", w: 300 })];
    expect(featuredPsus(result, tiny)).toEqual([]);
  });

  it("orders multiple sponsored models by ascending sponsorRank", () => {
    const sponsored: PsuModel[] = [
      model({ id: "sponsor-2", tier: "tier-a", w: 700, sponsorRank: 2 }),
      model({ id: "sponsor-1", tier: "tier-a", w: 900, sponsorRank: 1 }),
    ];
    expect(featuredPsus(result, sponsored).map((m) => m.id)).toEqual([
      "sponsor-1", // rank 1 before rank 2, regardless of wattage distance
      "sponsor-2",
    ]);
  });
});
