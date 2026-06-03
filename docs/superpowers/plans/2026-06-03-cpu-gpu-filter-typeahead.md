# CPU/GPU Filter + Typeahead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat CPU and GPU `<select>` controls with a hybrid picker: hard-constraint brand/socket filters plus a searchable model combobox that predicts as the user types.

**Architecture:** A pure matching helper (`lib/search.ts`) drives a generic downshift-based `Combobox`. Two thin wrappers, `CpuPicker` (brand + socket + model) and `GpuPicker` (brand + model, one per GPU row), own the filter state locally and emit the chosen id. `Calculator` keeps `Selection` unchanged and just delegates to the pickers.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, downshift (`useCombobox`), vitest (unit tests for the pure matcher).

---

## File Structure

**Create:**
- `src/lib/search.ts` — `normalize()` + `matches()` (pure, no deps).
- `src/lib/search.test.ts` — vitest unit tests for the matcher.
- `src/components/Combobox.tsx` — generic searchable single-select (downshift).
- `src/components/CpuPicker.tsx` — brand + socket selects + model combobox.
- `src/components/GpuPicker.tsx` — inline brand select + model combobox (one GPU row).
- `vitest.config.ts` — minimal node-env vitest config.

**Modify:**
- `package.json` — add `downshift`, `vitest` deps + `test` script (via npm).
- `src/components/Calculator.tsx` — wire pickers, drop flat `cpuOptions`/`gpuOptions`.

**Unchanged:** `ComponentSelect` (mobo/cooler/fans + the brand/socket selects), `Selection` type, `calculator.ts`.

---

### Task 1: Tooling — install deps and wire vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime + test deps**

Run:
```bash
npm install downshift
npm install -D vitest
```
Expected: both added to `package.json`; no peer-dependency errors that abort install.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"` (after `"lint"`):
```json
    "test": "vitest run",
```

- [ ] **Step 3: Create the vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: vitest exits 0 with "No test files found" (or runs 0 tests). The command must not error on config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add downshift and vitest tooling"
```

---

### Task 2: Pure matcher — `lib/search.ts` (TDD)

**Files:**
- Test: `src/lib/search.test.ts`
- Create: `src/lib/search.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/search.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { matches, normalize } from "./search";

describe("normalize", () => {
  it("lowercases and strips accents", () => {
    expect(normalize("ÁRC Battlemage")).toBe("arc battlemage");
  });
  it("collapses surrounding and inner whitespace", () => {
    expect(normalize("  RTX   50 ")).toBe("rtx 50");
  });
});

describe("matches", () => {
  const rtx5090 = "Nvidia RTX 50 RTX 5090";
  const rtx5080 = "Nvidia RTX 50 RTX 5080";
  const rtx4090 = "Nvidia RTX 40 RTX 4090";
  const rtx3050 = "Nvidia RTX 30 RTX 3050";
  const ryzen7700 = "AMD Zen 4 Ryzen 7 7700";

  it("RTX 50 matches the 50-series", () => {
    expect(matches(rtx5090, "RTX 50")).toBe(true);
    expect(matches(rtx5080, "RTX 50")).toBe(true);
  });
  it("RTX 50 excludes other series (the core requirement)", () => {
    expect(matches(rtx4090, "RTX 50")).toBe(false);
    expect(matches(rtx3050, "RTX 50")).toBe(false);
  });
  it("matches by model number fragment", () => {
    expect(matches(ryzen7700, "7700")).toBe(true);
  });
  it("is case- and accent-insensitive", () => {
    expect(matches("AMD ÁRC", "arc")).toBe(true);
    expect(matches(rtx5090, "rtx 50")).toBe(true);
  });
  it("empty or whitespace query matches everything", () => {
    expect(matches(rtx4090, "")).toBe(true);
    expect(matches(rtx4090, "   ")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./search` / `matches is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/search.ts`:
```ts
// Pure text-matching helpers for the searchable comboboxes.

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when `query` appears as a contiguous substring of `searchText`,
 * both normalized. Empty query matches everything.
 */
export function matches(searchText: string, query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  return normalize(searchText).includes(q);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all `normalize` and `matches` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts
git commit -m "feat: add contiguous-substring search matcher"
```

---

### Task 3: Generic `Combobox` component

**Files:**
- Create: `src/components/Combobox.tsx`

No automated DOM test (downshift owns keyboard/ARIA). Verified by typecheck + manual run in Task 6.

- [ ] **Step 1: Write the component**

Create `src/components/Combobox.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useCombobox } from "downshift";
import { matches } from "@/lib/search";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Concatenated text the typed query is matched against. */
  searchText: string;
}

interface ComboboxProps {
  label?: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

// Searchable single-select built on downshift's useCombobox.
// Filters options by contiguous-substring match on each option's searchText.
export function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: ComboboxProps) {
  const selectedItem = options.find((o) => o.value === value) ?? null;
  const [inputValue, setInputValue] = useState(selectedItem?.label ?? "");

  // Sync the visible text when the parent changes/clears the value
  // (e.g. a brand filter invalidated the current model).
  useEffect(() => {
    setInputValue(options.find((o) => o.value === value)?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const items = options.filter((o) => matches(o.searchText, inputValue));

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    getLabelProps,
    highlightedIndex,
  } = useCombobox({
    items,
    selectedItem,
    inputValue,
    itemToString: (item) => item?.label ?? "",
    onInputValueChange: ({ inputValue: iv }) => {
      const next = iv ?? "";
      setInputValue(next);
      if (next === "" && value !== null) onChange(null);
    },
    onSelectedItemChange: ({ selectedItem: item }) => {
      onChange(item?.value ?? null);
    },
  });

  return (
    <div className="block">
      {label && (
        <label
          {...getLabelProps()}
          className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...getInputProps()}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
        <ul
          {...getMenuProps()}
          className={
            isOpen && items.length > 0
              ? "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] py-1 text-sm shadow-lg"
              : "hidden"
          }
        >
          {isOpen &&
            items.map((item, index) => (
              <li
                key={item.value}
                {...getItemProps({ item, index })}
                className={
                  highlightedIndex === index
                    ? "cursor-pointer px-3 py-2 bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : "cursor-pointer px-3 py-2 text-[var(--color-text)]"
                }
              >
                {item.label}
              </li>
            ))}
        </ul>
        {isOpen && items.length === 0 && inputValue !== "" && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
            Sin coincidencias
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors (downshift types resolve).

- [ ] **Step 3: Commit**

```bash
git add src/components/Combobox.tsx
git commit -m "feat: add generic searchable Combobox"
```

---

### Task 4: `CpuPicker` — brand + socket + model

**Files:**
- Create: `src/components/CpuPicker.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/CpuPicker.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import type { Cpu } from "@/types/components";
import { ComponentSelect } from "./ComponentSelect";
import { Combobox, type ComboboxOption } from "./Combobox";

interface CpuPickerProps {
  cpus: Cpu[];
  value: string | null;
  onChange: (cpuId: string | null) => void;
}

// Hybrid CPU selector: hard-constraint brand + socket filters drive a
// searchable model combobox. Filter state is local UI state.
export function CpuPicker({ cpus, value, onChange }: CpuPickerProps) {
  const [brand, setBrand] = useState<string | null>(null);
  const [socket, setSocket] = useState<string | null>(null);

  const brandOptions = useMemo(
    () =>
      [...new Set(cpus.map((c) => c.brand))].map((b) => ({
        value: b,
        label: b,
      })),
    [cpus],
  );

  const socketOptions = useMemo(
    () =>
      [
        ...new Set(
          cpus
            .filter((c) => (brand === null || c.brand === brand) && c.socket)
            .map((c) => c.socket as string),
        ),
      ].map((s) => ({ value: s, label: s })),
    [cpus, brand],
  );

  const modelOptions = useMemo<ComboboxOption[]>(
    () =>
      cpus
        .filter(
          (c) =>
            (brand === null || c.brand === brand) &&
            (socket === null || c.socket === socket),
        )
        .map((c) => ({
          value: c.id,
          label: `${c.brand} ${c.model}`,
          searchText: `${c.brand} ${c.family} ${c.model}`,
        })),
    [cpus, brand, socket],
  );

  // Clear the chosen CPU if a filter change drops it from the visible set.
  function applyFilter(nextBrand: string | null, nextSocket: string | null) {
    setBrand(nextBrand);
    setSocket(nextSocket);
    if (
      value !== null &&
      !cpus.some(
        (c) =>
          c.id === value &&
          (nextBrand === null || c.brand === nextBrand) &&
          (nextSocket === null || c.socket === nextSocket),
      )
    ) {
      onChange(null);
    }
  }

  function handleBrandChange(nextBrand: string | null) {
    // A new brand can invalidate the selected socket; drop it if so.
    const socketStillValid =
      socket === null ||
      cpus.some(
        (c) =>
          (nextBrand === null || c.brand === nextBrand) && c.socket === socket,
      );
    applyFilter(nextBrand, socketStillValid ? socket : null);
  }

  return (
    <div className="space-y-3">
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
        CPU
      </span>
      <div className="grid grid-cols-2 gap-3">
        <ComponentSelect
          placeholder="Marca"
          options={brandOptions}
          value={brand}
          onChange={handleBrandChange}
        />
        <ComponentSelect
          placeholder="Socket"
          options={socketOptions}
          value={socket}
          onChange={(nextSocket) => applyFilter(brand, nextSocket)}
        />
      </div>
      <Combobox
        placeholder="Busca o elige tu CPU"
        options={modelOptions}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CpuPicker.tsx
git commit -m "feat: add CpuPicker with brand/socket filters"
```

---

### Task 5: `GpuPicker` — inline brand + model (one row)

**Files:**
- Create: `src/components/GpuPicker.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/GpuPicker.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import type { Gpu } from "@/types/components";
import { ComponentSelect } from "./ComponentSelect";
import { Combobox, type ComboboxOption } from "./Combobox";

interface GpuPickerProps {
  gpus: Gpu[];
  index: number;
  value: string | null;
  onChange: (gpuId: string | null) => void;
}

// One GPU row: inline brand filter (hard constraint) + searchable model
// combobox. Brand filter state is local to this row.
export function GpuPicker({ gpus, index, value, onChange }: GpuPickerProps) {
  const [brand, setBrand] = useState<string | null>(null);

  const brandOptions = useMemo(
    () =>
      [...new Set(gpus.map((g) => g.brand))].map((b) => ({
        value: b,
        label: b,
      })),
    [gpus],
  );

  const modelOptions = useMemo<ComboboxOption[]>(
    () =>
      gpus
        .filter((g) => brand === null || g.brand === brand)
        .map((g) => ({
          value: g.id,
          label: `${g.brand} ${g.model}`,
          searchText: `${g.brand} ${g.family} ${g.model}`,
        })),
    [gpus, brand],
  );

  function handleBrandChange(nextBrand: string | null) {
    setBrand(nextBrand);
    if (
      value !== null &&
      !gpus.some(
        (g) => g.id === value && (nextBrand === null || g.brand === nextBrand),
      )
    ) {
      onChange(null);
    }
  }

  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <ComponentSelect
        placeholder="Marca"
        options={brandOptions}
        value={brand}
        onChange={handleBrandChange}
      />
      <Combobox
        placeholder={`Busca o elige tu GPU ${index + 1}`}
        options={modelOptions}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/GpuPicker.tsx
git commit -m "feat: add GpuPicker with inline brand filter"
```

---

### Task 6: Wire pickers into `Calculator` + verify build

**Files:**
- Modify: `src/components/Calculator.tsx`

- [ ] **Step 1: Add the picker imports**

In `src/components/Calculator.tsx`, after the `import { ResultCard } ...` line, add:
```tsx
import { CpuPicker } from "./CpuPicker";
import { GpuPicker } from "./GpuPicker";
```

- [ ] **Step 2: Remove the flat option lists**

Delete these two blocks (they are replaced by the pickers' internal option building):
```tsx
const cpuOptions: SelectOption[] = cpus.map((c) => ({
  value: c.id,
  label: `${c.brand} ${c.model}`,
}));
const gpuOptions: SelectOption[] = gpus.map((g) => ({
  value: g.id,
  label: `${g.brand} ${g.model}`,
}));
```
(Keep `fanOptions` and `coolerOptions`.)

- [ ] **Step 3: Replace the CPU select with `CpuPicker`**

Replace this block:
```tsx
        <ComponentSelect
          label="CPU"
          placeholder="Selecciona tu CPU"
          options={cpuOptions}
          value={selection.cpuId}
          onChange={handleCpuChange}
        />
```
with:
```tsx
        <CpuPicker
          cpus={cpus}
          value={selection.cpuId}
          onChange={handleCpuChange}
        />
```

- [ ] **Step 4: Replace the GPU row select with `GpuPicker`**

Replace this block:
```tsx
              <div className="flex-1">
                <ComponentSelect
                  placeholder={`Selecciona tu GPU ${i + 1}`}
                  options={gpuOptions}
                  value={gpuId}
                  onChange={(id) => setGpuAt(i, id)}
                />
              </div>
```
with:
```tsx
              <div className="flex-1">
                <GpuPicker
                  gpus={gpus}
                  index={i}
                  value={gpuId}
                  onChange={(id) => setGpuAt(i, id)}
                />
              </div>
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. If lint flags `SelectOption` as unused, confirm it is still used by `moboOptions`/`fanOptions`/`coolerOptions` typing; it is, so no change needed. Remove any genuinely unused import it reports.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: build succeeds (static export), no type or compile errors.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`, open the app, then verify:
- CPU: typing `RTX` shows nothing relevant; typing `7700` surfaces Ryzen 7700; selecting brand `Intel` removes AMD sockets and AMD models.
- GPU: typing `RTX 50` shows only 50-series (no 4090, no 3050); switching brand to `AMD` clears an Nvidia model already chosen.
- Multi-GPU: `+ Agregar GPU` adds an independent row with its own brand filter.
- Result still computes after pressing `Calcular`.

- [ ] **Step 8: Commit**

```bash
git add src/components/Calculator.tsx
git commit -m "feat: use CpuPicker and GpuPicker in calculator"
```

---

## Self-Review Notes

- **Spec coverage:** hybrid pattern (Tasks 4/5) · contiguous-substring matching incl. "RTX 50" exclusion (Task 2) · downshift combobox (Tasks 1/3) · hard-constraint filters with clearing (Tasks 4/5) · GPU inline compact brand filter (Task 5) · `Selection`/`calculator.ts` untouched (Task 6 keeps `handleCpuChange` mobo logic) · "Sin coincidencias" empty state (Task 3). All covered.
- **Types:** `ComboboxOption { value, label, searchText }` defined in Task 3, consumed identically in Tasks 4/5. `matches(searchText, query)` signature from Task 2 used in Task 3.
- **No placeholders:** every code/command step is concrete.
