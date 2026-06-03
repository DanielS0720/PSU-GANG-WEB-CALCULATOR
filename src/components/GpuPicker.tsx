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
