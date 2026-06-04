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
