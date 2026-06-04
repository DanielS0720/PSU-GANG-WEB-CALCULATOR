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
  return { id: "x", brand: "B", model: "M", w: 850, tier: "tier-a", atx: "3.x", image: null, ...over };
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
    model({ id: "below-watts", tier: "tier-s", w: 600 }),                 // excluded: != 650 (below)
    model({ id: "above-watts", tier: "tier-a", w: 700 }),                 // excluded: != 650 (above, no oversize)
    model({ id: "sponsor-above", tier: "tier-a", w: 850, sponsorRank: 1 }), // excluded: oversize even if sponsored
    model({ id: "weak-tier", tier: "tier-c", w: 650 }),                   // excluded: worse than tier-a
    model({ id: "atx2-650", tier: "tier-s", w: 650, atx: "2.x" }),        // excluded: not ATX 3.x
    model({ id: "match-a", tier: "tier-a", w: 650 }),                     // compatible (exact watt, ATX 3.x)
    model({ id: "match-s", tier: "tier-s", w: 650 }),                     // compatible
    model({ id: "sponsor-650", tier: "tier-a", w: 650, sponsorRank: 1 }), // compatible, sponsored
  ];

  it("includes only ATX 3.x models whose wattage equals the recommended step", () => {
    const ids = featuredPsus(result, models).map((m) => m.id);
    expect(ids).toEqual(["sponsor-650", "match-a", "match-s"]);
  });

  it("never lists a higher-wattage model, even when sponsored", () => {
    const ids = featuredPsus(result, models).map((m) => m.id);
    expect(ids).not.toContain("above-watts");
    expect(ids).not.toContain("sponsor-above");
    expect(ids).not.toContain("below-watts");
  });

  it("excludes ATX 2.x models", () => {
    expect(featuredPsus(result, models).map((m) => m.id)).not.toContain("atx2-650");
  });

  it("lists sponsored exact-watt models first", () => {
    expect(featuredPsus(result, models).map((m) => m.id)[0]).toBe("sponsor-650");
  });

  it("honors the limit", () => {
    expect(featuredPsus(result, models, 2).map((m) => m.id)).toEqual([
      "sponsor-650",
      "match-a",
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
      model({ id: "sponsor-2", tier: "tier-a", w: 650, sponsorRank: 2 }),
      model({ id: "sponsor-1", tier: "tier-a", w: 650, sponsorRank: 1 }),
    ];
    expect(featuredPsus(result, sponsored).map((m) => m.id)).toEqual([
      "sponsor-1", // rank 1 before rank 2
      "sponsor-2",
    ]);
  });
});
