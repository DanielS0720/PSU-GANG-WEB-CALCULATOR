import type {
  AtxMode,
  Cooler,
  Cpu,
  Fan,
  Gpu,
  Motherboard,
  PsuStandard,
  Selection,
  Tier,
  WattMode,
} from "@/types/components";
import cpusData from "@/data/cpus.json";
import gpusData from "@/data/gpus.json";
import motherboardsData from "@/data/motherboards.json";
import fansData from "@/data/fans.json";
import coolersData from "@/data/coolers.json";
import psusData from "@/data/psus.json";
import tiersData from "@/data/tiers.json";

const cpus = cpusData as Cpu[];
const gpus = gpusData as Gpu[];
const motherboards = motherboardsData as Motherboard[];
const fans = fansData as Fan[];
const coolers = coolersData as Cooler[];
const psus = psusData as PsuStandard[];
const tiers = tiersData as Tier[];

/** Extra watts added per enabled option (overclock, future proof). */
export const OPTION_WATTS = 100;

/**
 * Tolerance allowed when stepping down to a standard PSU: a build can use a
 * standard whose wattage is within 5% below the build's draw.
 */
export const PSU_TOLERANCE = 1.05;

export interface CalculationResult {
  /** Base draw of the build (no overclock / future-proof extras). */
  baseWatts: number;
  /** Total build draw — base draw plus enabled extras (the raw sum shown). */
  totalWatts: number;
  /** Recommended standard PSU. `null` when the draw exceeds the top step. */
  recommendedPsu: PsuStandard | null;
  /** Tier from the CPU + GPU load. Extras never change the tier. */
  tier: Tier | null;
}

/**
 * Lowest standard PSU that covers `totalWatts` within the 5% tolerance, i.e.
 * the first step (ascending) where `totalWatts <= step.w * 1.05`. Returns
 * `null` when the draw exceeds even the largest step plus tolerance.
 */
export function recommendPsu(totalWatts: number): PsuStandard | null {
  return psus.find((psu) => totalWatts <= psu.w * PSU_TOLERANCE) ?? null;
}

/** Maps the ATX standard to which watt field of a component to use. */
function wattModeFor(mode: AtxMode): WattMode {
  // ATX 2.52 and below size for transient peaks; ATX 3.x covers power
  // excursion natively, so nominal TDP is enough.
  return mode === "atx-2" ? "peak_w" : "tdp_w";
}

/**
 * Watt draw of a CPU/GPU for the given ATX mode.
 * ATX 3.x sizes by TDP; when a component has no TDP in the dataset we fall
 * back to its transient peak so the result stays usable.
 */
function loadFor(
  component: { tdp_w: number | null; peak_w: number } | undefined,
  mode: AtxMode,
): number {
  if (!component) return 0;
  const field = wattModeFor(mode);
  return component[field] ?? component.peak_w ?? 0;
}

function findById<T extends { id: string }>(
  list: T[],
  id: string | null,
): T | undefined {
  if (id === null) return undefined;
  return list.find((item) => item.id === id);
}

/**
 * Minimum (worst) tier that supports both the CPU and GPU load.
 *
 * `tiers` is ordered best→worst (Tier X … Tier F). We walk it from worst to
 * best and return the first tier that violates neither limit, i.e. the lowest
 * tier whose `max_cpu_w >= cpuLoad` and `max_gpu_w >= gpuLoad`. A `null` limit
 * means "no restriction" (top tiers always fit).
 */
export function tierForLoads(cpuLoad: number, gpuLoad: number): Tier | null {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    const cpuOk = tier.max_cpu_w === null || tier.max_cpu_w >= cpuLoad;
    const gpuOk = tier.max_gpu_w === null || tier.max_gpu_w >= gpuLoad;
    if (cpuOk && gpuOk) return tier;
  }
  return null;
}

/**
 * Pure power calculation. No side effects.
 *
 *   baseWatts  = cpu[mode] + Σ gpu[mode] + mobo.avg_w + cooler.w + Σ (fan.w_per_unit * count)
 *   mode       = "peak_w" if ATX 2.52 or below, "tdp_w" if ATX 3.x (peak fallback)
 *   totalWatts = baseWatts + 100 per enabled extra (overclock / future proof)
 *
 * The tier is derived from the CPU + GPU load (per ATX mode) via tierForLoads —
 * overclock / future proof change the recommended wattage but never the assigned
 * tier. Components that are not selected contribute 0W.
 */
export function calculate(selection: Selection): CalculationResult {
  const cpu = findById(cpus, selection.cpuId);
  const motherboard = findById(motherboards, selection.motherboardId);

  const cpuWatts = loadFor(cpu, selection.mode);
  // Multi-GPU: total GPU load is the sum of every selected card.
  const gpuWatts = selection.gpuIds.reduce(
    (sum, id) => sum + loadFor(findById(gpus, id), selection.mode),
    0,
  );
  const moboWatts = motherboard?.avg_w ?? 0;

  // CPU cooler: adds to the recommended wattage, never to the tier. `null` w
  // (value not yet supplied) counts as 0.
  const cooler = findById(coolers, selection.coolerId);
  const coolerWatts = cooler?.w ?? 0;

  // Each fan row contributes (watts per unit) * (count of that type).
  const fanWatts = selection.fans.reduce((sum, row) => {
    const fan = findById(fans, row.fanId);
    const count = Math.max(0, Math.floor(row.count));
    return sum + (fan ? fan.w_per_unit * count : 0);
  }, 0);

  const optionWatts =
    (selection.overclock ? OPTION_WATTS : 0) +
    (selection.futureProof ? OPTION_WATTS : 0);

  const baseWatts = Math.ceil(
    cpuWatts + gpuWatts + moboWatts + coolerWatts + fanWatts,
  );
  const totalWatts = baseWatts + optionWatts;

  // Tier is driven by CPU + GPU load only (per ATX mode), never by the
  // recommended wattage or the overclock / future-proof extras.
  return {
    baseWatts,
    totalWatts,
    recommendedPsu: recommendPsu(totalWatts),
    tier: tierForLoads(cpuWatts, gpuWatts),
  };
}
