import tiersData from "@/data/tiers.json";
import type { Tier, PsuModel } from "@/types/components";
import type { CalculationResult } from "./calculator";

const tiers = tiersData as Tier[];

/**
 * Quality rank of a tier id: its index in tiers.json (ordered best→worst), so
 * a lower number is better. An unknown id ranks worst (tiers.length).
 */
export function tierRank(tierId: string): number {
  const i = tiers.findIndex((t) => t.id === tierId);
  return i === -1 ? tiers.length : i;
}

/** Human label for a tier id, or the raw id when unknown. */
export function tierLabel(tierId: string): string {
  return tiers.find((t) => t.id === tierId)?.label ?? tierId;
}

/**
 * Wattage a PSU must meet for this build: the recommended standard step (which
 * already includes the 5% tolerance), or the raw totalWatts when no standard
 * covers the build (> 5200W).
 */
export function wattBaseline(result: CalculationResult): number {
  return result.recommendedPsu?.w ?? result.totalWatts;
}

export interface PsuAdequacy {
  /** The PSU's quality tier is equal to or better than the build requires. */
  tierOk: boolean;
  /** The PSU's wattage covers the build's wattage baseline. */
  wattsOk: boolean;
}

/**
 * Whether a user-owned PSU model is adequate for the build result. Assumes the
 * build has a tier (callers guard `result.tier !== null`); a null tier is
 * treated as the worst rank so any model satisfies the tier check.
 */
export function checkPsuAdequacy(
  model: PsuModel,
  result: CalculationResult,
): PsuAdequacy {
  const requiredRank = tierRank(result.tier?.id ?? "");
  return {
    tierOk: tierRank(model.tier) <= requiredRank,
    wattsOk: model.w >= wattBaseline(result),
  };
}

/** Sponsored models sort by ascending positive rank; non-sponsored sort last. */
function sponsorKey(m: PsuModel): number {
  return m.sponsorRank && m.sponsorRank > 0 ? m.sponsorRank : Infinity;
}

/**
 * Up to `limit` PSU models compatible with the build (quality tier equal-or-
 * better AND wattage at or above the baseline), sponsored first, then by
 * wattage closest to the baseline (avoids oversizing). Empty when the build has
 * no tier or nothing is compatible. `models` is injected for testability.
 */
export function featuredPsus(
  result: CalculationResult,
  models: PsuModel[],
  limit = 4,
): PsuModel[] {
  if (!result.tier) return [];
  const requiredRank = tierRank(result.tier.id);
  const baseline = wattBaseline(result);

  const compatible = models.filter(
    (m) => tierRank(m.tier) <= requiredRank && m.w >= baseline,
  );

  return [...compatible]
    .sort((a, b) => {
      const sa = sponsorKey(a);
      const sb = sponsorKey(b);
      if (sa !== sb) return sa - sb;
      return Math.abs(a.w - baseline) - Math.abs(b.w - baseline);
    })
    .slice(0, limit);
}
