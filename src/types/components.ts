// TypeScript interfaces for the static JSON datasets in src/data/.

export type AtxMode = "atx-2" | "atx-3";

/** Watt field selected from a component depending on the ATX mode. */
export type WattMode = "peak_w" | "tdp_w";

/** Power rail a component draws from. */
export type Rail = "12v" | "5v" | "3v3";

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
  /** Consumption per single fan unit, in watts (12V). */
  w_per_unit: number;
  /** Extra draw per unit on the 5V rail when the fan is RGB. */
  rgb_5v?: number;
}

/** CPU cooler: air tower or AIO liquid. */
export interface Cooler {
  id: string;
  label: string;
  type: "air" | "aio";
  /** Consumption in watts (12V). `null` until supplied; counts as 0W. */
  w: number | null;
  /** Draw on the 5V rail when the cooler is RGB (5/10/15 by size). */
  rgb_5v?: number;
}

/** A standard PSU wattage step. */
export interface PsuStandard {
  w: number;
  /** True for high-wattage units that need a 220V/230V install. */
  requires_220v: boolean;
}

/** A real PSU model on the quality tier list, used for the adequacy alert and featured models. */
export interface PsuModel {
  id: string;
  brand: string;
  model: string;
  /** Rated wattage. */
  w: number;
  /** Quality tier id, one of the ids in tiers.json (e.g. "tier-a"). */
  tier: string;
  /**
   * Product image path under /public (e.g. "/psus/<id>.webp"), or null.
   * Most models are null; only ~4 per tier ship a real image.
   */
  image: string | null;
  /**
   * Sponsored placement. Absent or 0 = normal. A positive value sorts ahead of
   * non-sponsored models in the featured list; lower positive value sorts first.
   */
  sponsorRank?: number;
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

/** NVMe generation option (the only unit with subtypes). */
export interface StorageSubtype {
  id: string;
  label: string;
  /** Consumption per drive, in watts. */
  w: number;
}

/** A storage unit kind. `w` for fixed units (HDD, SSD); `subtypes` for NVMe. */
export interface StorageUnit {
  id: string;
  label: string;
  rail: Rail;
  w?: number;
  subtypes?: StorageSubtype[];
}

/** One storage row: a unit, an optional NVMe subtype, and a quantity (0–8). */
export interface StorageSelection {
  unitId: string | null;
  subtypeId: string | null;
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
  /** One row per storage unit (max 4 rows). */
  storage: StorageSelection[];
  overclock: boolean;
  futureProof: boolean;
}
