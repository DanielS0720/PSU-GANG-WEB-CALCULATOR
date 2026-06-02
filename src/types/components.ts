// TypeScript interfaces for the static JSON datasets in src/data/.

export type AtxMode = "atx-2" | "atx-3";

/** Watt field selected from a component depending on the ATX mode. */
export type WattMode = "peak_w" | "tdp_w";

export interface Cpu {
  id: string;
  brand: string;
  family: string;
  model: string;
  socket: string | null;
  /** Nominal TDP — used in ATX 3.x. `null` when unknown in the dataset. */
  tdp_w: number | null;
  /** Transient peak — used in ATX 2.52 and below. */
  peak_w: number;
}

export interface Gpu {
  id: string;
  brand: string;
  family: string;
  model: string;
  /** Nominal TDP — used in ATX 3.x. `null` when unknown in the dataset. */
  tdp_w: number | null;
  /** Transient peak — used in ATX 2.52 and below. */
  peak_w: number;
}

export interface Motherboard {
  id: string;
  label: string;
  /** Chipset name, e.g. "Z890". */
  chipset?: string;
  /** CPU socket this board uses, e.g. "LGA1851". Filters by selected CPU. */
  socket: string;
  /** Average board consumption in watts. */
  avg_w: number;
}

export interface Fan {
  id: string;
  label: string;
  /** Consumption per single fan unit, in watts. */
  w_per_unit: number;
}

/** CPU cooler: air tower or AIO liquid. */
export interface Cooler {
  id: string;
  label: string;
  type: "air" | "aio";
  /** Consumption in watts. `null` until the value is supplied; counts as 0W. */
  w: number | null;
}

/** A standard PSU wattage step. */
export interface PsuStandard {
  w: number;
  /** True for high-wattage units that need a 220V/230V install. */
  requires_220v: boolean;
}

export interface Tier {
  id: string;
  label: string;
  /** Static path under /public, e.g. "/tiers/tier-b.webp". */
  image: string;
  /** Max CPU load (W) this tier supports. `null` = no limit (top tiers). */
  max_cpu_w: number | null;
  /** Max GPU load (W) this tier supports. `null` = no limit (top tiers). */
  max_gpu_w: number | null;
}

/** One fan row: a fan type plus how many of that type are installed. */
export interface FanSelection {
  fanId: string | null;
  count: number;
}

/** Full user selection consumed by the calculator. */
export interface Selection {
  mode: AtxMode;
  cpuId: string | null;
  /** One entry per GPU slot (multi-GPU). `null` = slot not yet chosen. */
  gpuIds: (string | null)[];
  motherboardId: string | null;
  /** Single CPU cooler. `null` = none selected. */
  coolerId: string | null;
  /** One entry per fan type, each with its own quantity. */
  fans: FanSelection[];
  overclock: boolean;
  futureProof: boolean;
}
