# PSU Model Alert + Featured Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user optionally pick the PSU model they own and warn when it is inadequate (quality tier or wattage), and show up to 4 compatible real PSU models (sponsored first) after calculating.

**Architecture:** A new static dataset `psu-models.json` plus a `PsuModel` type. Pure, dependency-injected logic in a new `src/lib/psuModels.ts` (tier ranking, adequacy check, featured filter/sort) mirrors the existing pure `calculator.ts` and is unit-tested with vitest. Three client components — `PsuPicker` (reuses `Combobox`), `AdequacyAlert`, `FeaturedPsus` — are wired into `Calculator` with a PSU-model state that lives outside `Selection` (it never feeds `calculate`).

**Tech Stack:** Next.js (App Router), React client components, TypeScript, Tailwind (CSS vars), downshift `Combobox`, vitest.

---

## File Structure

- Create `src/data/psu-models.json` — seed dataset of real PSU models.
- Modify `src/types/components.ts` — add `PsuModel` interface.
- Create `src/lib/psuModels.ts` — pure helpers: `tierRank`, `tierLabel`, `wattBaseline`, `checkPsuAdequacy`, `featuredPsus`.
- Create `src/lib/psuModels.test.ts` — vitest unit tests for the helpers.
- Create `src/components/PsuPicker.tsx` — optional brand-filtered model combobox.
- Create `src/components/AdequacyAlert.tsx` — green/orange adequacy message.
- Create `src/components/FeaturedPsus.tsx` — up to 4 compatible model cards.
- Modify `src/components/Calculator.tsx` — PSU-model state, render picker + alert + featured.

---

### Task 1: `PsuModel` type and seed dataset

**Files:**
- Modify: `src/types/components.ts` (append after the `PsuStandard` interface, around line 70)
- Create: `src/data/psu-models.json`

- [ ] **Step 1: Add the `PsuModel` interface**

In `src/types/components.ts`, immediately after the existing `PsuStandard` interface block, add:

```typescript
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
```

- [ ] **Step 2: Create the seed dataset**

Create `src/data/psu-models.json` with this starter content (real models replace/extend this later from Daniel's document; ids are `<brand>-<model>` kebab-case):

```json
[
  { "id": "corsair-rm850x", "brand": "Corsair", "model": "RM850x", "w": 850, "tier": "tier-a", "image": "/psus/corsair-rm850x.webp", "sponsorRank": 1 },
  { "id": "corsair-rm750x", "brand": "Corsair", "model": "RM750x", "w": 750, "tier": "tier-a", "image": null },
  { "id": "seasonic-focus-gx-850", "brand": "Seasonic", "model": "Focus GX-850", "w": 850, "tier": "tier-s", "image": null },
  { "id": "seasonic-focus-gx-650", "brand": "Seasonic", "model": "Focus GX-650", "w": 650, "tier": "tier-s", "image": null },
  { "id": "evga-supernova-850-g6", "brand": "EVGA", "model": "SuperNOVA 850 G6", "w": 850, "tier": "tier-b-plus", "image": null },
  { "id": "evga-supernova-650-g6", "brand": "EVGA", "model": "SuperNOVA 650 G6", "w": 650, "tier": "tier-b-plus", "image": null },
  { "id": "thermaltake-smart-600", "brand": "Thermaltake", "model": "Smart 600", "w": 600, "tier": "tier-d", "image": null },
  { "id": "thermaltake-smart-500", "brand": "Thermaltake", "model": "Smart 500", "w": 500, "tier": "tier-d", "image": null },
  { "id": "genericpower-700", "brand": "GenericPower", "model": "GP-700", "w": 700, "tier": "tier-f", "image": null }
]
```

- [ ] **Step 3: Verify the JSON parses and types compile**

Run: `npx tsc --noEmit`
Expected: no errors (the new interface and JSON are syntactically valid; nothing imports them yet).

- [ ] **Step 4: Commit**

```bash
git add src/types/components.ts src/data/psu-models.json
git commit -m "feat(data): add PsuModel type and seed psu-models dataset"
```

---

### Task 2: `tierRank`, `tierLabel`, and `wattBaseline` helpers

**Files:**
- Create: `src/lib/psuModels.ts`
- Test: `src/lib/psuModels.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/psuModels.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: FAIL — `Failed to resolve import "./psuModels"` / functions not defined.

- [ ] **Step 3: Create `src/lib/psuModels.ts` with the three helpers**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: PASS (tierRank, tierLabel, wattBaseline groups green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/psuModels.ts src/lib/psuModels.test.ts
git commit -m "feat(psu): add tierRank, tierLabel, and wattBaseline helpers"
```

---

### Task 3: `checkPsuAdequacy`

**Files:**
- Modify: `src/lib/psuModels.ts`
- Test: `src/lib/psuModels.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/psuModels.test.ts` (add the import and a new describe block). Change the existing import line to:

```typescript
import { tierRank, tierLabel, wattBaseline, checkPsuAdequacy } from "./psuModels";
```

Then append:

```typescript
import type { PsuModel } from "@/types/components";

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: FAIL — `checkPsuAdequacy is not a function`.

- [ ] **Step 3: Implement `checkPsuAdequacy`**

Append to `src/lib/psuModels.ts`:

```typescript
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
  const requiredRank = result.tier ? tierRank(result.tier.id) : tiers.length;
  return {
    tierOk: tierRank(model.tier) <= requiredRank,
    wattsOk: model.w >= wattBaseline(result),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/psuModels.ts src/lib/psuModels.test.ts
git commit -m "feat(psu): add checkPsuAdequacy tier+watts check"
```

---

### Task 4: `featuredPsus` filter and sort

**Files:**
- Modify: `src/lib/psuModels.ts`
- Test: `src/lib/psuModels.test.ts`

- [ ] **Step 1: Add failing tests**

Update the import line in `src/lib/psuModels.test.ts` to:

```typescript
import { tierRank, tierLabel, wattBaseline, checkPsuAdequacy, featuredPsus } from "./psuModels";
```

Append:

```typescript
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

  it("returns [] when the build has no tier", () => {
    expect(featuredPsus(makeResult({ tier: null }), models)).toEqual([]);
  });

  it("returns [] when nothing is compatible", () => {
    const tiny = [model({ id: "tiny", tier: "tier-f", w: 300 })];
    expect(featuredPsus(result, tiny)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: FAIL — `featuredPsus is not a function`.

- [ ] **Step 3: Implement `featuredPsus`**

Append to `src/lib/psuModels.ts`:

```typescript
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
      const sponsor = sponsorKey(a) - sponsorKey(b);
      if (sponsor !== 0) return sponsor;
      return Math.abs(a.w - baseline) - Math.abs(b.w - baseline);
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/psuModels.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: PASS — existing calculator/search tests plus the new psuModels tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/psuModels.ts src/lib/psuModels.test.ts
git commit -m "feat(psu): add featuredPsus compatible filter and sponsored sort"
```

---

### Task 5: `PsuPicker` component

**Files:**
- Create: `src/components/PsuPicker.tsx`

- [ ] **Step 1: Create the component**

Mirrors `CpuPicker`'s brand-filter + `Combobox` pattern, simplified (no socket). Optional selector.

```tsx
"use client";

import { useMemo, useState } from "react";
import type { PsuModel } from "@/types/components";
import { ComponentSelect } from "./ComponentSelect";
import { Combobox, type ComboboxOption } from "./Combobox";

interface PsuPickerProps {
  models: PsuModel[];
  value: string | null;
  onChange: (id: string | null) => void;
}

// Optional "which PSU do you own" selector: a brand filter narrows a searchable
// model combobox. Brand filter is local UI state; the chosen model id is lifted.
export function PsuPicker({ models, value, onChange }: PsuPickerProps) {
  const [brand, setBrand] = useState<string | null>(null);

  const brandOptions = useMemo(
    () =>
      [...new Set(models.map((m) => m.brand))].map((b) => ({
        value: b,
        label: b,
      })),
    [models],
  );

  const modelOptions = useMemo<ComboboxOption[]>(
    () =>
      models
        .filter((m) => brand === null || m.brand === brand)
        .map((m) => ({
          value: m.id,
          label: `${m.brand} ${m.model}`,
          searchText: `${m.brand} ${m.model}`,
        })),
    [models, brand],
  );

  // Clear the chosen model if a brand change drops it from the visible set.
  function handleBrand(nextBrand: string | null) {
    setBrand(nextBrand);
    if (
      value !== null &&
      nextBrand !== null &&
      !models.some((m) => m.id === value && m.brand === nextBrand)
    ) {
      onChange(null);
    }
  }

  return (
    <div className="space-y-3">
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
        Tu fuente{" "}
        <span className="lowercase text-[var(--color-muted)]/70">(opcional)</span>
      </span>
      <ComponentSelect
        placeholder="Marca (todas)"
        options={brandOptions}
        value={brand}
        onChange={handleBrand}
      />
      <Combobox
        placeholder="Busca o elige tu fuente"
        options={modelOptions}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PsuPicker.tsx
git commit -m "feat(ui): add optional PsuPicker model selector"
```

---

### Task 6: `AdequacyAlert` component

**Files:**
- Create: `src/components/AdequacyAlert.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { PsuModel } from "@/types/components";
import type { CalculationResult } from "@/lib/calculator";
import { checkPsuAdequacy, wattBaseline, tierLabel } from "@/lib/psuModels";

interface AdequacyAlertProps {
  model: PsuModel;
  result: CalculationResult;
}

// Adequacy verdict for the user's own PSU vs the build. Green when adequate,
// orange with one line per failing check otherwise. Callers render this only
// when a model is selected and result.tier is set.
export function AdequacyAlert({ model, result }: AdequacyAlertProps) {
  const { tierOk, wattsOk } = checkPsuAdequacy(model, result);
  const name = `${model.brand} ${model.model}`;

  if (tierOk && wattsOk) {
    return (
      <div className="mt-4 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">
        ✓ Tu fuente ({name}) es adecuada para este build.
      </div>
    );
  }

  const reasons: string[] = [];
  if (!tierOk) {
    reasons.push(
      `Calidad insuficiente: tu fuente es ${tierLabel(model.tier)} y el build requiere ${
        result.tier ? result.tier.label : ""
      }.`,
    );
  }
  if (!wattsOk) {
    reasons.push(
      `Potencia insuficiente: tu fuente entrega ${model.w} W y se recomiendan ${wattBaseline(
        result,
      )} W.`,
    );
  }

  return (
    <div className="mt-4 rounded-md border border-[var(--color-orange)]/50 bg-[var(--color-orange)]/10 p-3 text-sm text-[var(--color-orange)]">
      <p className="font-semibold">⚠ Tu fuente ({name}) no es adecuada</p>
      <ul className="mt-1 list-disc pl-5 space-y-1">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdequacyAlert.tsx
git commit -m "feat(ui): add AdequacyAlert for user PSU vs build"
```

---

### Task 7: `FeaturedPsus` component

**Files:**
- Create: `src/components/FeaturedPsus.tsx`

- [ ] **Step 1: Create the component**

Renders up to 4 compatible models as cards: product image (or a placeholder when `image` is null), name, wattage, tier badge, and a "Destacado" label for sponsored models. Reads the dataset directly (display-only; logic is injected/tested in `featuredPsus`).

```tsx
import Image from "next/image";
import type { PsuModel } from "@/types/components";
import type { CalculationResult } from "@/lib/calculator";
import { featuredPsus, tierLabel } from "@/lib/psuModels";
import psuModelsData from "@/data/psu-models.json";

const psuModels = psuModelsData as PsuModel[];

interface FeaturedPsusProps {
  result: CalculationResult;
}

// Up to 4 PSU models compatible with the calculated build, sponsored first.
// Hidden when the build has no tier; shows an empty state when nothing fits.
export function FeaturedPsus({ result }: FeaturedPsusProps) {
  if (!result.tier) return null;

  const models = featuredPsus(result, psuModels);

  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-widest text-[var(--color-muted)] mb-4">
        Fuentes recomendadas para tu build
      </h2>

      {models.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Sin modelos para este consumo.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => (
            <article
              key={m.id}
              className="rounded-lg border border-[var(--color-surface)] p-4 text-center"
            >
              <div className="relative mx-auto mb-3 aspect-square w-full max-w-[160px] overflow-hidden rounded-md bg-[var(--color-surface)]">
                {m.image ? (
                  <Image
                    src={m.image}
                    alt={`${m.brand} ${m.model}`}
                    width={160}
                    height={160}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)] text-2xl font-semibold">
                    {m.brand.charAt(0)}
                  </div>
                )}
              </div>

              {m.sponsorRank && m.sponsorRank > 0 ? (
                <span className="mb-1 inline-block rounded bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                  Destacado
                </span>
              ) : null}

              <p className="text-sm font-semibold text-[var(--color-text)]">
                {m.brand} {m.model}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {m.w} W · {tierLabel(m.tier)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeaturedPsus.tsx
git commit -m "feat(ui): add FeaturedPsus compatible-models section"
```

---

### Task 8: Wire picker, alert, and featured into `Calculator`

**Files:**
- Modify: `src/components/Calculator.tsx`

- [ ] **Step 1: Add imports**

In the import block of `src/components/Calculator.tsx`, add the new types/components/data. After the existing `import { GpuPicker } from "./GpuPicker";` line add:

```typescript
import { PsuPicker } from "./PsuPicker";
import { AdequacyAlert } from "./AdequacyAlert";
import { FeaturedPsus } from "./FeaturedPsus";
```

In the type import (`import type { ... } from "@/types/components";`) add `PsuModel` to the list. After the existing `import storageData from "@/data/storage.json";` line add:

```typescript
import psuModelsData from "@/data/psu-models.json";
```

After the existing `const coolers = coolersData as Cooler[];` line add:

```typescript
const psuModels = psuModelsData as PsuModel[];
```

- [ ] **Step 2: Add PSU-model state**

Inside `export function Calculator()`, right after the existing `const [error, setError] = useState<string | null>(null);` line, add:

```typescript
  // The user's own PSU model, used for the adequacy alert. It does NOT feed
  // calculate(), so it lives outside Selection and survives recalculation.
  const [psuModelId, setPsuModelId] = useState<string | null>(null);
  const selectedPsuModel = psuModels.find((m) => m.id === psuModelId) ?? null;
```

- [ ] **Step 3: Render the picker in the form**

In the JSX, locate the `</fieldset>` that closes the "Opciones extra" block (just before the `Calcular` button). Immediately after that `</fieldset>` add:

```tsx
        <PsuPicker
          models={psuModels}
          value={psuModelId}
          onChange={setPsuModelId}
        />
```

- [ ] **Step 4: Render the adequacy alert under ResultCard**

In the right `<aside>`, the current content is:

```tsx
      <aside>
        <ResultCard result={result} />
        {result && (
```

Insert the alert between `<ResultCard .../>` and the `{result && (` buy-guide block:

```tsx
      <aside>
        <ResultCard result={result} />
        {result && selectedPsuModel && (
          <AdequacyAlert model={selectedPsuModel} result={result} />
        )}
        {result && (
```

- [ ] **Step 5: Render FeaturedPsus below the grid**

The component currently `return (<div className="grid ...">...</div>);`. Wrap the grid in a fragment and append the featured section. Change the opening `return (` and the matching final `);` so the structure becomes:

Opening — change:

```tsx
  return (
    <div className="grid gap-8 md:grid-cols-[320px_minmax(0,1fr)_320px] md:items-start">
```

to:

```tsx
  return (
    <>
    <div className="grid gap-8 md:grid-cols-[320px_minmax(0,1fr)_320px] md:items-start">
```

Closing — change the final:

```tsx
    </div>
  );
}
```

to:

```tsx
    </div>
    {result && <FeaturedPsus result={result} />}
    </>
  );
}
```

- [ ] **Step 6: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`, open the app.
- Select a CPU + motherboard (e.g. any with a GPU) and press **Calcular**.
- Confirm a "Fuentes recomendadas para tu build" section appears below with up to 4 cards, the sponsored one (Corsair RM850x) labeled "Destacado" first when compatible.
- In "Tu fuente", pick a weak model (e.g. Thermaltake Smart 500) → orange alert with the failing reason(s). Pick a strong, high-watt model → green "es adecuada".
- Confirm leaving "Tu fuente" empty shows no alert.

- [ ] **Step 8: Commit**

```bash
git add src/components/Calculator.tsx
git commit -m "feat(ui): wire PSU picker, adequacy alert, and featured models"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — all suites green.

- [ ] **Step 2: Typecheck and production build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: both succeed with no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

---

## Notes for the implementer

- **Real data:** the seed `psu-models.json` is a placeholder. Daniel's full ~700-model document gets converted into this same shape later; `id` must stay unique kebab-case. Only ~4 models per tier will carry a real `image`; the rest stay `image: null` and render the initial-letter placeholder.
- **Images:** real product images go under `public/psus/<id>.webp`. The `next/image` config already serves `/public`; no config change needed for local assets.
- **Monetization:** raise a model's priority by setting `sponsorRank` (1 = highest). Multiple sponsors order by ascending rank.
