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
