"use client";

import { useMemo, useState } from "react";
import type {
  Cpu,
  Gpu,
  Motherboard,
  Fan,
  Cooler,
  Selection,
} from "@/types/components";
import { calculate, type CalculationResult } from "@/lib/calculator";
import { AtxToggle } from "./AtxToggle";
import { ComponentSelect, type SelectOption } from "./ComponentSelect";
import { ResultCard } from "./ResultCard";
import { CpuPicker } from "./CpuPicker";
import { GpuPicker } from "./GpuPicker";
import cpusData from "@/data/cpus.json";
import gpusData from "@/data/gpus.json";
import motherboardsData from "@/data/motherboards.json";
import fansData from "@/data/fans.json";
import coolersData from "@/data/coolers.json";

const cpus = cpusData as Cpu[];
const gpus = gpusData as Gpu[];
const motherboards = motherboardsData as Motherboard[];
const fans = fansData as Fan[];
const coolers = coolersData as Cooler[];

// Enlace guía de compra
const BUY_GUIDE_URL =
  "https://docs.google.com/document/d/1iYZZeiiHBoXyctOdptDJ2oFYJ03mYiyT3XrXqXJIIQ8/edit?usp=sharing";

const MAX_FANS = 15;
const MAX_GPUS = 4;
const MAX_FAN_ROWS = 3;

const fanOptions: SelectOption[] = fans.map((f) => ({
  value: f.id,
  label: f.label,
}));
const coolerOptions: SelectOption[] = coolers.map((c) => ({
  value: c.id,
  label: c.label,
}));

export function Calculator() {
  // Draft = what the user is editing. The result is computed only when the
  // user presses "Calcular", so the ATX mode (and every other field) is
  // applied explicitly instead of live.
  const [selection, setSelection] = useState<Selection>({
    mode: "atx-2",
    cpuId: null,
    gpuIds: [null],
    motherboardId: null,
    coolerId: null,
    fans: [{ fanId: null, count: 0 }],
    overclock: false,
    futureProof: false,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patch(changes: Partial<Selection>) {
    // Editing the form invalidates the previous result until recomputed.
    setSelection((prev) => ({ ...prev, ...changes }));
    setResult(null);
    setError(null);
  }

  // --- Socket-based motherboard filter --------------------------------------
  // The CPU picker's socket filter, lifted here so the motherboard section can
  // gate on it (mobo stays locked until a socket is defined).
  const [cpuFilterSocket, setCpuFilterSocket] = useState<string | null>(null);

  // Selected CPU's socket. `null` when no CPU is chosen or its socket is unknown.
  const cpuSocket =
    cpus.find((c) => c.id === selection.cpuId)?.socket ?? null;

  // Effective socket = the explicit socket filter, or the chosen CPU's socket.
  // `null` = no socket yet → the motherboard select is gated (empty + disabled).
  const effectiveSocket = cpuFilterSocket ?? cpuSocket;

  const moboOptions = useMemo<SelectOption[]>(
    () =>
      effectiveSocket === null
        ? []
        : motherboards
            .filter((m) => m.socket === effectiveSocket)
            .map((m) => ({ value: m.id, label: m.label })),
    [effectiveSocket],
  );

  // Changing the CPU clears the selected motherboard if its socket no longer
  // matches, so a hidden incompatible board can't leak into the calculation.
  function handleCpuChange(cpuId: string | null) {
    const cpu = cpus.find((c) => c.id === cpuId);
    const mobo = motherboards.find((m) => m.id === selection.motherboardId);
    const keepMobo = !cpu?.socket || !mobo || mobo.socket === cpu.socket;
    patch({ cpuId, motherboardId: keepMobo ? selection.motherboardId : null });
  }

  // The socket filter moved — clear an incompatible motherboard for the same
  // reason as above.
  function handleCpuSocketFilter(socket: string | null) {
    setCpuFilterSocket(socket);
    const mobo = motherboards.find((m) => m.id === selection.motherboardId);
    if (socket !== null && mobo && mobo.socket !== socket) {
      patch({ motherboardId: null });
    }
  }

  // --- GPU rows -------------------------------------------------------------
  function setGpuAt(index: number, gpuId: string | null) {
    patch({ gpuIds: selection.gpuIds.map((id, i) => (i === index ? gpuId : id)) });
  }
  function addGpu() {
    if (selection.gpuIds.length >= MAX_GPUS) return;
    patch({ gpuIds: [...selection.gpuIds, null] });
  }
  function removeGpuAt(index: number) {
    if (selection.gpuIds.length <= 1) return;
    patch({ gpuIds: selection.gpuIds.filter((_, i) => i !== index) });
  }

  // --- Fan rows -------------------------------------------------------------
  function setFanIdAt(index: number, fanId: string | null) {
    patch({
      fans: selection.fans.map((row, i) =>
        i === index ? { ...row, fanId } : row,
      ),
    });
  }
  function setFanCountAt(index: number, count: number) {
    patch({
      fans: selection.fans.map((row, i) =>
        i === index ? { ...row, count } : row,
      ),
    });
  }
  function addFan() {
    if (selection.fans.length >= MAX_FAN_ROWS) return;
    patch({ fans: [...selection.fans, { fanId: null, count: 0 }] });
  }
  function removeFanAt(index: number) {
    if (selection.fans.length <= 1) return;
    patch({ fans: selection.fans.filter((_, i) => i !== index) });
  }

  function handleCalculate() {
    // GPU opcional: CPUs con gráficos integrados (ej. 8600G) no requieren GPU dedicada.
    if (selection.cpuId === null || selection.motherboardId === null) {
      setError("Selecciona al menos CPU y motherboard para calcular.");
      setResult(null);
      return;
    }
    setError(null);
    setResult(calculate(selection));
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <section className="space-y-5">
        <AtxToggle mode={selection.mode} onChange={(mode) => patch({ mode })} />

        <CpuPicker
          cpus={cpus}
          value={selection.cpuId}
          onChange={handleCpuChange}
          onSocketChange={handleCpuSocketFilter}
        />

        {/* GPUs — multi-GPU: one row per card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
              GPU{selection.gpuIds.length > 1 ? "s" : ""}{" "}
              <span className="lowercase text-[var(--color-muted)]/70">(opcional)</span>
            </span>
            {selection.gpuIds.length < MAX_GPUS && (
              <button
                type="button"
                onClick={addGpu}
                className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)] hover:opacity-80"
              >
                + Agregar GPU
              </button>
            )}
          </div>
          {selection.gpuIds.map((gpuId, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <GpuPicker
                  gpus={gpus}
                  index={i}
                  value={gpuId}
                  onChange={(id) => setGpuAt(i, id)}
                />
              </div>
              {selection.gpuIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGpuAt(i)}
                  aria-label={`Eliminar GPU ${i + 1}`}
                  className="rounded-md border border-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-red-400 hover:border-red-400"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <ComponentSelect
          label="Motherboard"
          placeholder={
            effectiveSocket
              ? `Socket ${effectiveSocket} — elige chipset`
              : "Elige el socket del CPU primero"
          }
          options={moboOptions}
          value={selection.motherboardId}
          onChange={(motherboardId) => patch({ motherboardId })}
        />

        <ComponentSelect
          label="Disipador"
          placeholder="Selecciona el disipador"
          options={coolerOptions}
          value={selection.coolerId}
          onChange={(coolerId) => patch({ coolerId })}
        />

        {/* Fans — one row per fan type, each with its own quantity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
              Ventiladores
            </span>
            {selection.fans.length < MAX_FAN_ROWS && (
              <button
                type="button"
                onClick={addFan}
                className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)] hover:opacity-80"
              >
                + Agregar ventilador
              </button>
            )}
          </div>
          {selection.fans.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 grid grid-cols-[1fr_100px] gap-3 items-end">
                <ComponentSelect
                  placeholder="Tipo de ventilador"
                  options={fanOptions}
                  value={row.fanId}
                  onChange={(fanId) => setFanIdAt(i, fanId)}
                />
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2">
                    Cantidad
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_FANS}
                    value={row.count}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const clamped = Number.isNaN(n)
                        ? 0
                        : Math.min(MAX_FANS, Math.max(0, Math.floor(n)));
                      setFanCountAt(i, clamped);
                    }}
                    className="w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </label>
              </div>
              {selection.fans.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFanAt(i)}
                  aria-label={`Eliminar ventilador ${i + 1}`}
                  className="rounded-md border border-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-red-400 hover:border-red-400"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1">
            Opciones extra
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selection.overclock}
              onChange={(e) => patch({ overclock: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Overclock (+100W)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selection.futureProof}
              onChange={(e) => patch({ futureProof: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Future Proof (+100W)
          </label>
        </fieldset>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full rounded-md bg-[var(--color-accent)] px-4 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-[var(--color-bg)] transition hover:opacity-90 active:opacity-80"
        >
          Calcular
        </button>
        {error && (
          <p className="font-mono text-xs text-red-400">{error}</p>
        )}
      </section>

      <aside>
        <ResultCard result={result} />
        {result && (
          <div className="mt-4 text-center">
            <a
              href={BUY_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-semibold text-[var(--color-accent)] underline underline-offset-4 hover:opacity-80"
            >
              ¿Quieres saber qué fuente comprar?
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
