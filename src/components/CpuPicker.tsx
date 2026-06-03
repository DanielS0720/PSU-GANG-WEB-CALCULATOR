"use client";

import { useMemo, useState } from "react";
import type { Cpu } from "@/types/components";
import { ComponentSelect } from "./ComponentSelect";
import { Combobox, type ComboboxOption } from "./Combobox";

interface CpuPickerProps {
  cpus: Cpu[];
  value: string | null;
  onChange: (cpuId: string | null) => void;
  /** Notifies the parent of the active socket filter (drives the mobo gate). */
  onSocketChange?: (socket: string | null) => void;
}

// Hybrid CPU selector: hard-constraint brand + socket filters drive a
// searchable model combobox. Brand must be chosen before socket/model unlock.
// Filter state is local UI state.
export function CpuPicker({
  cpus,
  value,
  onChange,
  onSocketChange,
}: CpuPickerProps) {
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

  // Empty until a brand is chosen — keeps the socket select disabled (gated).
  const socketOptions = useMemo(
    () =>
      brand === null
        ? []
        : [
            ...new Set(
              cpus
                .filter((c) => c.brand === brand && c.socket)
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
    onSocketChange?.(nextSocket);
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
          placeholder={brand === null ? "Elige marca" : "Socket"}
          options={socketOptions}
          value={socket}
          onChange={(nextSocket) => applyFilter(brand, nextSocket)}
        />
      </div>
      <Combobox
        placeholder={
          brand === null ? "Elige marca primero" : "Busca o elige tu CPU"
        }
        options={modelOptions}
        value={value}
        onChange={onChange}
        disabled={brand === null}
      />
    </div>
  );
}
