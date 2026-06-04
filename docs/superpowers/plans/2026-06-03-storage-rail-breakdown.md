# Storage + Per-Rail Consumption Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side consumption breakdown box that splits draw across 12V / 5V / 3.3V rails, plus a storage section (HDD / SSD SATA / NVMe) feeding those rails.

**Architecture:** Storage modeled in a new `storage.json` (two-level: unit → optional NVMe subtype). RGB 5V draw added as an optional `rgb_5v` field on existing RGB fan/cooler entries (12V values untouched). `calculate()` is extended with pure helpers and returns a per-rail `breakdown`; the recommended PSU and tier still derive only from the 12V total (+ extras). A new `BreakdownCard` renders the 12V list and an "Cálculo Avanzado" toggle for the full component × rail table.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, Vitest 4.

---

## File Structure

- Create `src/data/storage.json` — storage unit/subtype dataset.
- Modify `src/data/fans.json` — add `rgb_5v: 5` to RGB entries.
- Modify `src/data/coolers.json` — add `rgb_5v` (5/10/15) to RGB entries.
- Modify `src/types/components.ts` — `Rail`, `StorageSubtype`, `StorageUnit`, `StorageSelection`; `rgb_5v?` on `Fan`/`Cooler`; `storage` on `Selection`.
- Modify `src/lib/calculator.ts` — storage/RGB helpers, `BreakdownLine`/`RailBreakdown`, extend `calculate()`.
- Create `src/lib/calculator.test.ts` — unit tests for the new logic.
- Create `src/components/BreakdownCard.tsx` — the breakdown UI.
- Modify `src/components/Calculator.tsx` — storage section in the form; render `BreakdownCard` in the aside.

Conventions: run a single test file with `npx vitest run <path>`; run all with `npm test`. Commit after each task.

---

### Task 1: Storage dataset + RGB 5V data fields

**Files:**
- Create: `src/data/storage.json`
- Modify: `src/data/fans.json`
- Modify: `src/data/coolers.json`

- [ ] **Step 1: Create `src/data/storage.json`**

```json
{
  "units": [
    { "id": "hdd", "label": "HDD", "rail": "12v", "w": 20 },
    { "id": "ssd-sata", "label": "SSD SATA", "rail": "5v", "w": 8 },
    {
      "id": "nvme",
      "label": "NVMe",
      "rail": "3v3",
      "subtypes": [
        { "id": "pcie3", "label": "PCIe 3.0", "w": 8 },
        { "id": "pcie4", "label": "PCIe 4.0", "w": 12 },
        { "id": "pcie5", "label": "PCIe 5.0", "w": 15 }
      ]
    }
  ]
}
```

- [ ] **Step 2: Add `rgb_5v` to the RGB entries in `src/data/fans.json`**

Replace the two `*-rgb` lines so each RGB fan declares 5W on the 5V rail (12V `w_per_unit` unchanged):

```json
  { "id": "120mm-rgb", "label": "120mm RGB", "w_per_unit": 3.44, "rgb_5v": 5 },
  { "id": "140mm-rgb", "label": "140mm RGB", "w_per_unit": 3.44, "rgb_5v": 5 }
```

- [ ] **Step 3: Add `rgb_5v` to the RGB entries in `src/data/coolers.json`**

Add `"rgb_5v"` to every `*-rgb` entry per size class (single/AIO120 = 5; double/AIO240/280 = 10; AIO360/420 = 15). Leave non-RGB entries unchanged. Final RGB lines:

```json
  { "id": "air-tower-single-rgb", "label": "Torre simple RGB", "type": "air", "w": 3.44, "rgb_5v": 5 },
  { "id": "air-tower-double-rgb", "label": "Torre doble RGB", "type": "air", "w": 6.88, "rgb_5v": 10 },
  { "id": "aio-120-rgb", "label": "AIO 120mm RGB", "type": "aio", "w": 18.44, "rgb_5v": 5 },
  { "id": "aio-240-rgb", "label": "AIO 240mm RGB", "type": "aio", "w": 21.88, "rgb_5v": 10 },
  { "id": "aio-240-screen-rgb", "label": "AIO 240mm RGB con pantalla", "type": "aio", "w": 36.88, "rgb_5v": 10 },
  { "id": "aio-280-rgb", "label": "AIO 280mm RGB", "type": "aio", "w": 21.88, "rgb_5v": 10 },
  { "id": "aio-280-screen-rgb", "label": "AIO 280mm RGB con pantalla", "type": "aio", "w": 36.88, "rgb_5v": 10 },
  { "id": "aio-360-rgb", "label": "AIO 360mm RGB", "type": "aio", "w": 25.32, "rgb_5v": 15 },
  { "id": "aio-360-screen-rgb", "label": "AIO 360mm RGB con pantalla", "type": "aio", "w": 40.32, "rgb_5v": 15 },
  { "id": "aio-420-rgb", "label": "AIO 420mm RGB", "type": "aio", "w": 25.32, "rgb_5v": 15 },
  { "id": "aio-420-screen-rgb", "label": "AIO 420mm RGB con pantalla", "type": "aio", "w": 40.32, "rgb_5v": 15 }
```

- [ ] **Step 4: Verify JSON parses (type-check the build inputs)**

Run: `npx tsc --noEmit`
Expected: no errors (JSON is valid; types added in Task 2 not yet referenced).

- [ ] **Step 5: Commit**

```bash
git add src/data/storage.json src/data/fans.json src/data/coolers.json
git commit -m "feat(data): add storage dataset and rgb_5v fields"
```

---

### Task 2: Types for storage and rails

**Files:**
- Modify: `src/types/components.ts`

- [ ] **Step 1: Add rail + storage types and `rgb_5v` fields**

In `src/types/components.ts`, add after the `WattMode` type:

```ts
/** Power rail a component draws from. */
export type Rail = "12v" | "5v" | "3v3";
```

Add `rgb_5v` to `Fan` and `Cooler` (optional; absent = no RGB 5V draw):

```ts
export interface Fan {
  id: string;
  label: string;
  /** Consumption per single fan unit, in watts (12V). */
  w_per_unit: number;
  /** Extra draw per unit on the 5V rail when the fan is RGB. */
  rgb_5v?: number;
}
```

```ts
export interface Cooler {
  id: string;
  label: string;
  type: "air" | "aio";
  /** Consumption in watts (12V). `null` until supplied; counts as 0W. */
  w: number | null;
  /** Draw on the 5V rail when the cooler is RGB (5/10/15 by size). */
  rgb_5v?: number;
}
```

Add the storage interfaces (near the bottom, before `Selection`):

```ts
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
```

Add `storage` to `Selection`:

```ts
  /** One row per storage unit (max 4 rows). */
  storage: StorageSelection[];
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: errors only in `Calculator.tsx` (missing `storage` in the initial state) — that is fixed in Task 5. No errors in `types/components.ts`.

> Note: if you prefer a clean compile here, you may skip running tsc until Task 5; the type additions themselves are valid.

- [ ] **Step 3: Commit**

```bash
git add src/types/components.ts
git commit -m "feat(types): add Rail, storage types, rgb_5v fields"
```

---

### Task 3: Storage + RGB watt helpers (TDD)

**Files:**
- Modify: `src/lib/calculator.ts`
- Create: `src/lib/calculator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/calculator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveStorage, fanRgb5v, coolerRgb5v } from "./calculator";
import type { Cooler, Fan } from "@/types/components";

describe("resolveStorage", () => {
  it("HDD on 12V: 2 units = 40W", () => {
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 2 })).toEqual({
      label: "HDD ×2",
      rail: "12v",
      watts: 40,
    });
  });

  it("SSD SATA on 5V: 1 unit = 8W", () => {
    expect(resolveStorage({ unitId: "ssd-sata", subtypeId: null, count: 1 })).toEqual({
      label: "SSD SATA ×1",
      rail: "5v",
      watts: 8,
    });
  });

  it("NVMe uses the selected subtype watts (PCIe 5.0 = 15W) on 3.3V", () => {
    expect(resolveStorage({ unitId: "nvme", subtypeId: "pcie5", count: 2 })).toEqual({
      label: "NVMe PCIe 5.0 ×2",
      rail: "3v3",
      watts: 30,
    });
  });

  it("returns null for empty/unresolved rows", () => {
    expect(resolveStorage({ unitId: null, subtypeId: null, count: 1 })).toBeNull();
    expect(resolveStorage({ unitId: "nvme", subtypeId: null, count: 1 })).toBeNull();
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 0 })).toBeNull();
  });

  it("clamps count to 8", () => {
    expect(resolveStorage({ unitId: "hdd", subtypeId: null, count: 99 })?.watts).toBe(160);
  });
});

describe("fanRgb5v / coolerRgb5v", () => {
  const rgbFan: Fan = { id: "120mm-rgb", label: "120mm RGB", w_per_unit: 3.44, rgb_5v: 5 };
  const plainFan: Fan = { id: "120mm-standard", label: "120mm", w_per_unit: 1.88 };
  const rgbAio: Cooler = { id: "aio-360-rgb", label: "AIO 360 RGB", type: "aio", w: 25.32, rgb_5v: 15 };
  const plainAio: Cooler = { id: "aio-360", label: "AIO 360", type: "aio", w: 20.49 };

  it("RGB fan: 6 units = 30W on 5V", () => {
    expect(fanRgb5v(rgbFan, 6)).toBe(30);
  });
  it("non-RGB fan contributes 0", () => {
    expect(fanRgb5v(plainFan, 6)).toBe(0);
    expect(fanRgb5v(undefined, 6)).toBe(0);
  });
  it("RGB cooler returns its rgb_5v; non-RGB returns 0", () => {
    expect(coolerRgb5v(rgbAio)).toBe(15);
    expect(coolerRgb5v(plainAio)).toBe(0);
    expect(coolerRgb5v(undefined)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/calculator.test.ts`
Expected: FAIL — `resolveStorage`/`fanRgb5v`/`coolerRgb5v` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/lib/calculator.ts`, add the storage import near the other data imports:

```ts
import storageData from "@/data/storage.json";
```

Add to the type import list at the top: `Rail`, `StorageSelection`, `StorageUnit`:

```ts
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
```

Add the dataset cast near the others:

```ts
const storageUnits = storageData.units as StorageUnit[];
```

Add the helpers (after `findById`):

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/calculator.test.ts`
Expected: PASS (all `resolveStorage`/`fanRgb5v`/`coolerRgb5v` cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator.ts src/lib/calculator.test.ts
git commit -m "feat(calc): storage + rgb 5V watt helpers"
```

---

### Task 4: Per-rail breakdown in `calculate()` (TDD)

**Files:**
- Modify: `src/lib/calculator.ts`
- Modify: `src/lib/calculator.test.ts`

- [ ] **Step 1: Add failing tests for the extended result**

Append to `src/lib/calculator.test.ts`:

```ts
import { calculate } from "./calculator";
import type { Selection } from "@/types/components";

function baseSelection(over: Partial<Selection> = {}): Selection {
  return {
    mode: "atx-2",
    cpuId: null,
    gpuIds: [null],
    motherboardId: null,
    coolerId: null,
    fans: [{ fanId: null, count: 0 }],
    storage: [],
    overclock: false,
    futureProof: false,
    ...over,
  };
}

describe("calculate — per-rail breakdown", () => {
  it("HDD adds to the 12V total and affects the recommended PSU", () => {
    const without = calculate(baseSelection({ cpuId: null }));
    const withHdd = calculate(
      baseSelection({ storage: [{ unitId: "hdd", subtypeId: null, count: 2 }] }),
    );
    expect(withHdd.breakdown.rail12).toBe(without.breakdown.rail12 + 40);
    expect(withHdd.totalWatts).toBe(without.totalWatts + 40);
  });

  it("SSD/NVMe land on 5V/3.3V and do NOT change totalWatts or tier", () => {
    const base = baseSelection({
      storage: [
        { unitId: "ssd-sata", subtypeId: null, count: 1 },
        { unitId: "nvme", subtypeId: "pcie4", count: 2 },
      ],
    });
    const r = calculate(base);
    expect(r.breakdown.rail5).toBe(8);
    expect(r.breakdown.rail3v3).toBe(24);
    expect(r.totalWatts).toBe(0); // nothing on 12V
    expect(r.tier).toBe(calculate(baseSelection()).tier);
  });

  it("RGB fans and RGB cooler add to 5V only", () => {
    const r = calculate(
      baseSelection({
        coolerId: "aio-360-rgb",
        fans: [{ fanId: "120mm-rgb", count: 6 }],
      }),
    );
    // 6 fans × 5W + cooler 15W = 45W on 5V
    expect(r.breakdown.rail5).toBe(45);
  });

  it("breakdown.lines carries the storage rows", () => {
    const r = calculate(
      baseSelection({ storage: [{ unitId: "hdd", subtypeId: null, count: 2 }] }),
    );
    expect(r.breakdown.lines).toContainEqual(
      expect.objectContaining({ label: "HDD ×2", v12: 40, v5: 0, v3v3: 0 }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/calculator.test.ts`
Expected: FAIL — `result.breakdown` is undefined; `Selection` has no `storage` on existing call sites in the test (the test supplies it, so failure is on `breakdown`).

- [ ] **Step 3: Extend `CalculationResult` and `calculate()`**

In `src/lib/calculator.ts`, add the breakdown types above `CalculationResult`:

```ts
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
```

Add `breakdown` to `CalculationResult`:

```ts
  /** Per-rail consumption breakdown (12V drives the recommendation; 5V/3.3V informational). */
  breakdown: RailBreakdown;
```

Replace the body of `calculate()` from the `coolerWatts`/`fanWatts` section through the `return` with rail-aware logic. The final function:

```ts
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

  return {
    baseWatts,
    totalWatts,
    recommendedPsu: recommendPsu(totalWatts),
    tier: tierForLoads(cpuWatts, gpuWatts),
    breakdown: { rail12: baseWatts, rail5, rail3v3, lines },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/calculator.test.ts`
Expected: PASS (all breakdown cases).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: PASS — existing `search.test.ts` plus new `calculator.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calculator.ts src/lib/calculator.test.ts
git commit -m "feat(calc): per-rail breakdown with storage and rgb 5V"
```

---

### Task 5: Storage section in the form

**Files:**
- Modify: `src/components/Calculator.tsx`

- [ ] **Step 1: Add storage data import and the initial state field**

At the top of `src/components/Calculator.tsx`, add the import and the constant block:

```ts
import storageData from "@/data/storage.json";
import type { StorageUnit } from "@/types/components";

const storageUnits = storageData.units as StorageUnit[];
const MAX_STORAGE_ROWS = 4;
const MAX_STORAGE_PER_ROW = 8;

const storageUnitOptions: SelectOption[] = storageUnits.map((u) => ({
  value: u.id,
  label: u.label,
}));
```

In the `useState<Selection>` initializer, add `storage` to the object:

```ts
    fans: [{ fanId: null, count: 0 }],
    storage: [{ unitId: null, subtypeId: null, count: 0 }],
    overclock: false,
```

- [ ] **Step 2: Add storage row handlers**

After the fan-row handlers (`removeFanAt`), add:

```ts
  // --- Storage rows ---------------------------------------------------------
  function setStorageUnitAt(index: number, unitId: string | null) {
    // Changing the unit clears any stale NVMe subtype.
    patch({
      storage: selection.storage.map((row, i) =>
        i === index ? { ...row, unitId, subtypeId: null } : row,
      ),
    });
  }
  function setStorageSubtypeAt(index: number, subtypeId: string | null) {
    patch({
      storage: selection.storage.map((row, i) =>
        i === index ? { ...row, subtypeId } : row,
      ),
    });
  }
  function setStorageCountAt(index: number, count: number) {
    patch({
      storage: selection.storage.map((row, i) =>
        i === index ? { ...row, count } : row,
      ),
    });
  }
  function addStorage() {
    if (selection.storage.length >= MAX_STORAGE_ROWS) return;
    patch({ storage: [...selection.storage, { unitId: null, subtypeId: null, count: 0 }] });
  }
  function removeStorageAt(index: number) {
    if (selection.storage.length <= 1) return;
    patch({ storage: selection.storage.filter((_, i) => i !== index) });
  }
```

- [ ] **Step 3: Render the storage section**

In the JSX, insert this block immediately after the closing `</div>` of the Fans section and before the `<fieldset>` "Opciones extra":

```tsx
        {/* Storage — one row per unit; NVMe unlocks the subtype select */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
              Almacenamiento
            </span>
            {selection.storage.length < MAX_STORAGE_ROWS && (
              <button
                type="button"
                onClick={addStorage}
                className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)] hover:opacity-80"
              >
                + Agregar unidad
              </button>
            )}
          </div>
          {selection.storage.map((row, i) => {
            const unit = storageUnits.find((u) => u.id === row.unitId);
            const subtypeOptions: SelectOption[] =
              unit?.subtypes?.map((s) => ({ value: s.id, label: s.label })) ?? [];
            return (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-[1fr_1fr_80px] gap-3 items-end">
                  <ComponentSelect
                    placeholder="Unidad"
                    options={storageUnitOptions}
                    value={row.unitId}
                    onChange={(unitId) => setStorageUnitAt(i, unitId)}
                  />
                  <ComponentSelect
                    placeholder={subtypeOptions.length ? "Tipo" : "—"}
                    options={subtypeOptions}
                    value={row.subtypeId}
                    onChange={(subtypeId) => setStorageSubtypeAt(i, subtypeId)}
                  />
                  <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2">
                      Cantidad
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={row.count === 0 ? "" : String(row.count)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 1);
                        const n = digits === "" ? 0 : Number(digits);
                        setStorageCountAt(i, Math.min(MAX_STORAGE_PER_ROW, n));
                      }}
                      className="w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                  </label>
                </div>
                {selection.storage.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStorageAt(i)}
                    aria-label={`Eliminar unidad ${i + 1}`}
                    className="rounded-md border border-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-red-400 hover:border-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
```

> Note: the count input caps at one digit then clamps to 8, matching the fan-input pattern (empty shows as `0`). The "Tipo" select auto-disables (`options.length === 0`) for HDD/SSD via `ComponentSelect`'s built-in `disabled`.

- [ ] **Step 4: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Calculator.tsx
git commit -m "feat(ui): storage section in the calculator form"
```

---

### Task 6: BreakdownCard + aside integration

**Files:**
- Create: `src/components/BreakdownCard.tsx`
- Modify: `src/components/Calculator.tsx`

- [ ] **Step 1: Create `src/components/BreakdownCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { CalculationResult } from "@/lib/calculator";

interface BreakdownCardProps {
  result: CalculationResult | null;
}

// Right-aside consumption breakdown. Normal view lists the 12V draw; the
// "Cálculo Avanzado" toggle reveals the full component × rail table. 5V/3.3V
// are informational and never change the recommended PSU.
export function BreakdownCard({ result }: BreakdownCardProps) {
  const [advanced, setAdvanced] = useState(false);
  if (!result) return null;

  const { lines, rail12, rail5, rail3v3 } = result.breakdown;
  const rail12Lines = lines.filter((l) => l.v12 > 0);

  return (
    <div className="mt-4 rounded-lg border border-[var(--color-surface)] bg-[var(--color-surface)] p-6">
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-3">
        Desglose de consumo (12V)
      </span>

      {rail12Lines.length === 0 ? (
        <p className="font-mono text-xs text-[var(--color-muted)]">Sin consumo en 12V.</p>
      ) : (
        <dl className="space-y-1 font-mono text-sm">
          {rail12Lines.map((l, i) => (
            <div key={i} className="flex justify-between">
              <dt className="text-[var(--color-muted)]">{l.label}</dt>
              <dd className="text-[var(--color-text)]">{l.v12} W</dd>
            </div>
          ))}
        </dl>
      )}

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-accent)] hover:opacity-80"
      >
        {advanced ? "▴ Ocultar avanzado" : "▾ Cálculo Avanzado"}
      </button>

      {advanced && (
        <div className="mt-3 border-t border-dashed border-[var(--color-muted)]/30 pt-3">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="text-[var(--color-muted)]">
                <th className="py-1 text-left font-normal">Componente</th>
                <th className="py-1 text-right font-normal">12V</th>
                <th className="py-1 text-right font-normal">5V</th>
                <th className="py-1 text-right font-normal">3.3V</th>
              </tr>
            </thead>
            <tbody>
              {lines
                .filter((l) => l.v12 > 0 || l.v5 > 0 || l.v3v3 > 0)
                .map((l, i) => (
                  <tr key={i} className="border-t border-[var(--color-bg)]/40">
                    <td className="py-1 text-left text-[var(--color-muted)]">{l.label}</td>
                    <td className="py-1 text-right">{l.v12 || "—"}</td>
                    <td className="py-1 text-right">{l.v5 || "—"}</td>
                    <td className="py-1 text-right">{l.v3v3 || "—"}</td>
                  </tr>
                ))}
              <tr className="border-t border-[var(--color-muted)]/40 font-semibold text-[var(--color-text)]">
                <td className="py-1 text-left">Total riel</td>
                <td className="py-1 text-right">{rail12}</td>
                <td className="py-1 text-right">{rail5}</td>
                <td className="py-1 text-right">{rail3v3}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 font-mono text-[10px] text-[var(--color-muted)]">
            5V y 3.3V son informativos — no cambian la fuente recomendada.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render `BreakdownCard` in the aside**

In `src/components/Calculator.tsx`, add the import:

```ts
import { BreakdownCard } from "./BreakdownCard";
```

In the `<aside>`, add `<BreakdownCard>` right after `<ResultCard result={result} />`:

```tsx
      <aside>
        <ResultCard result={result} />
        <BreakdownCard result={result} />
        {result && (
```

- [ ] **Step 3: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/BreakdownCard.tsx src/components/Calculator.tsx
git commit -m "feat(ui): breakdown card with Cálculo Avanzado toggle"
```

---

### Task 7: Manual verification

**Files:** none (runtime check)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open `http://localhost:3000`.

- [ ] **Step 2: Verify the flow**

- Select a CPU + motherboard; add an RGB cooler and RGB fans (e.g. 6 × 120mm RGB).
- Add storage rows: HDD ×2, SSD SATA ×1, NVMe PCIe 4.0 ×2. Confirm the "Tipo" select is disabled for HDD/SSD and active for NVMe.
- Press **Calcular**.
- Confirm the breakdown lists 12V components (incl. HDD ×2 = 40W).
- Click **Cálculo Avanzado**: confirm the table shows 5V (fans 30 + cooler + SSD 8) and 3.3V (NVMe 24), and that the recommended PSU value matches the no-storage-5V/3.3V case (only HDD changed it).

- [ ] **Step 3: Confirm the build passes**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Final commit (if any lint/format fixes were needed)**

```bash
git add -A
git commit -m "chore: storage breakdown manual-verification fixups" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Right-side breakdown box → Task 6 (BreakdownCard). ✓
- CPU/GPU/Mobo/Fans/Cooling 12V lines → Task 4 (`lines`) + Task 6. ✓
- HDD (12V) / SSD (5V) / NVMe (3.3V, PCIe 3/4/5 subtypes) → Tasks 1–4. ✓
- User picks unit/type/count, up to 4 rows × 8 units → Task 5 (`MAX_STORAGE_ROWS`, clamp to 8). ✓
- "Cálculo Avanzado" reveals 5V + 3.3V → Task 6 toggle. ✓
- RGB fans + RGB coolers draw 5V → Tasks 1, 3, 4 (`rgb_5v`, `fanRgb5v`, `coolerRgb5v`). ✓
- PSU/tier stay 12V-only; HDD counts, 5V/3.3V informational → Task 4 (`totalWatts`, `recommendPsu`, `tierForLoads`). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `StorageSelection {unitId, subtypeId, count}`, `ResolvedStorage {label, rail, watts}`, `BreakdownLine {label, v12, v5, v3v3}`, `RailBreakdown {rail12, rail5, rail3v3, lines}` used identically across Tasks 2–6. `rgb_5v` field name consistent in data, types, and helpers. ✓
