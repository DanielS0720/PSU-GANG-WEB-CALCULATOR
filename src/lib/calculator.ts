import type {
  AtxMode,
  Cooler,
  Cpu,
  Fan,
  Gpu,
  Motherboard,
  PsuStandard,
  Rail,
  Selection,
  StorageSelection,
  StorageUnit,
  Tier,
  WattMode,
} from "@/types/components";
import cpusData from "@/data/cpus.json";
import gpusData from "@/data/gpus.json";
import motherboardsData from "@/data/motherboards.json";
import fansData from "@/data/fans.json";
import coolersData from "@/data/coolers.json";
import psusData from "@/data/psus.json";
import storageData from "@/data/storage.json";
import tiersData from "@/data/tiers.json";

const cpus = cpusData as Cpu[];
const gpus = gpusData as Gpu[];
const motherboards = motherboardsData as Motherboard[];
const fans = fansData as Fan[];
const coolers = coolersData as Cooler[];
const psus = psusData as PsuStandard[];
const storageUnits = storageData.units as StorageUnit[];
const tiers = tiersData as Tier[];

/** Extra watts added per enabled option (overclock, future proof). */
export const OPTION_WATTS = 100;

/**
 * Tolerance allowed when stepping down to a standard PSU: a build can use a
 * standard whose wattage is within 5% below the build's draw.
 */
export const PSU_TOLERANCE = 1.05;

/** One row of the consumption breakdown, split across rails. */
export interface BreakdownLine {
  label: string;
  v12: number;
  v5: number;
  v3v3: number;
}

/** Per-rail totals plus the line items that compose them. */
export interface RailBreakdown {
  rail12: number;
  rail5: number;
  rail3v3: number;
  lines: BreakdownLine[];
}

export interface CalculationResult {
  /** Base draw of the build (no overclock / future-proof extras). */
  baseWatts: number;
  /** Total build draw — base draw plus enabled extras (the raw sum shown). */
  totalWatts: number;
  /** Recommended standard PSU. `null` when the draw exceeds the top step. */
  recommendedPsu: PsuStandard | null;
  /** Tier from the CPU + GPU load. Extras never change the tier. */
  tier: Tier | null;
  /** Per-rail consumption breakdown (12V drives the recommendation; 5V/3.3V informational). */
  breakdown: RailBreakdown;
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

/** A resolved, non-empty storage row ready to add to a rail. */
export interface ResolvedStorage {
  label: string;
  rail: Rail;
  /** Total watts for the row: per-drive watt × count. */
  watts: number;
}

/**
 * Resolves one storage row to its rail contribution, or `null` when the row is
 * empty/incomplete (no unit, NVMe without subtype, or count 0). Count is floored
 * and clamped to 0–8.
 */
export function resolveStorage(sel: StorageSelection): ResolvedStorage | null {
  const unit = storageUnits.find((u) => u.id === sel.unitId);
  if (!unit) return null;
  const count = Math.min(8, Math.max(0, Math.floor(sel.count)));
  if (count === 0) return null;

  let perUnit: number;
  let label = unit.label;
  if (unit.subtypes) {
    const subtype = unit.subtypes.find((s) => s.id === sel.subtypeId);
    if (!subtype) return null;
    perUnit = subtype.w;
    label = `${unit.label} ${subtype.label}`;
  } else {
    perUnit = unit.w ?? 0;
  }
  return { label: `${label} ×${count}`, rail: unit.rail, watts: perUnit * count };
}

/** 5V draw of an RGB fan row: `rgb_5v` per unit × count (0 when not RGB). */
export function fanRgb5v(fan: Fan | undefined, count: number): number {
  if (!fan?.rgb_5v) return 0;
  return fan.rgb_5v * Math.max(0, Math.floor(count));
}

/** 5V draw of an RGB cooler (0 when not RGB). */
export function coolerRgb5v(cooler: Cooler | undefined): number {
  return cooler?.rgb_5v ?? 0;
}

/**
 * Minimum (worst) tier that supports both the CPU and GPU load.
 *
 * `tiers` is ordered best→worst (Tier S … Tier F). We walk it from worst to
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
  const gpuWatts = selection.gpuIds.reduce(
    (sum, id) => sum + loadFor(findById(gpus, id), selection.mode),
    0,
  );
  const moboWatts = motherboard?.avg_w ?? 0;

  const cooler = findById(coolers, selection.coolerId);
  const coolerWatts = cooler?.w ?? 0;
  const coolerRgb = coolerRgb5v(cooler);

  // Fans: 12V from w_per_unit × count; 5V from rgb_5v × count.
  let fanWatts = 0;
  let fanRgb = 0;
  for (const row of selection.fans) {
    const fan = findById(fans, row.fanId);
    const count = Math.max(0, Math.floor(row.count));
    if (fan) {
      fanWatts += fan.w_per_unit * count;
      fanRgb += fanRgb5v(fan, count);
    }
  }

  // Storage: each resolved row contributes to exactly one rail.
  const storageLines: BreakdownLine[] = [];
  let storage12 = 0;
  let storage5 = 0;
  let storage3v3 = 0;
  for (const row of selection.storage) {
    const resolved = resolveStorage(row);
    if (!resolved) continue;
    const line: BreakdownLine = { label: resolved.label, v12: 0, v5: 0, v3v3: 0 };
    if (resolved.rail === "12v") {
      line.v12 = resolved.watts;
      storage12 += resolved.watts;
    } else if (resolved.rail === "5v") {
      line.v5 = resolved.watts;
      storage5 += resolved.watts;
    } else {
      line.v3v3 = resolved.watts;
      storage3v3 += resolved.watts;
    }
    storageLines.push(line);
  }

  const optionWatts =
    (selection.overclock ? OPTION_WATTS : 0) +
    (selection.futureProof ? OPTION_WATTS : 0);

  // 12V base: existing components + HDD storage. Drives the PSU recommendation.
  const baseWatts = Math.ceil(
    cpuWatts + gpuWatts + moboWatts + coolerWatts + fanWatts + storage12,
  );
  const totalWatts = baseWatts + optionWatts;

  const rail5 = coolerRgb + fanRgb + storage5;
  const rail3v3 = storage3v3;

  // Component lines for the breakdown (only non-zero rows are shown by the UI).
  const lines: BreakdownLine[] = [
    { label: "CPU", v12: cpuWatts, v5: 0, v3v3: 0 },
    { label: "GPU", v12: gpuWatts, v5: 0, v3v3: 0 },
    { label: "Motherboard", v12: moboWatts, v5: 0, v3v3: 0 },
    { label: "Disipador", v12: coolerWatts, v5: coolerRgb, v3v3: 0 },
    { label: "Ventiladores", v12: fanWatts, v5: fanRgb, v3v3: 0 },
    ...storageLines,
  ];

  // Tier is driven by CPU + GPU load only (per ATX mode), never by the
  // recommended wattage or the overclock / future-proof extras.
  return {
    baseWatts,
    totalWatts,
    recommendedPsu: recommendPsu(totalWatts),
    tier: tierForLoads(cpuWatts, gpuWatts),
    breakdown: { rail12: baseWatts, rail5, rail3v3, lines },
  };
}
