"use client";

import { useEffect, useState } from "react";
import type { CalculationResult } from "@/lib/calculator";

interface BreakdownCardProps {
  result: CalculationResult | null;
}

// Right-aside consumption breakdown. Normal view lists the 12V draw; the
// "Cálculo Avanzado" toggle reveals the full component × rail table. 5V/3.3V
// are informational and never change the recommended PSU.
export function BreakdownCard({ result }: BreakdownCardProps) {
  const [advanced, setAdvanced] = useState(false);
  // Collapse the advanced view whenever a fresh result arrives.
  useEffect(() => {
    setAdvanced(false);
  }, [result]);
  if (!result) return null;

  const { lines, rail12, rail5, rail3v3 } = result.breakdown;
  const rail12Lines = lines.filter((l) => l.v12 > 0);

  return (
    <div className="rounded-lg border border-[var(--color-surface)] bg-[var(--color-surface)] p-6">
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
        <div className="mt-3 border-t border-dashed border-[var(--color-muted)]/30 pt-3 overflow-x-auto">
          <table className="w-full border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--color-muted)]/30">
                <th className="py-2 pr-2 text-left font-medium text-[var(--color-muted)]">
                  Componente
                </th>
                <th className="py-2 px-2 text-right font-semibold text-[var(--color-accent)]">
                  12V
                </th>
                <th className="py-2 px-2 text-right font-semibold text-amber-400">5V</th>
                <th className="py-2 pl-2 text-right font-semibold text-sky-400">3.3V</th>
              </tr>
            </thead>
            <tbody>
              {lines
                .filter((l) => l.v12 > 0 || l.v5 > 0 || l.v3v3 > 0)
                .map((l, i) => (
                  <tr key={i} className="border-t border-[var(--color-bg)]/50">
                    <td className="py-2 pr-2 text-left text-[var(--color-text)]">{l.label}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--color-text)]">
                      {l.v12 || <span className="text-[var(--color-muted)]/50">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--color-text)]">
                      {l.v5 || <span className="text-[var(--color-muted)]/50">—</span>}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums text-[var(--color-text)]">
                      {l.v3v3 || <span className="text-[var(--color-muted)]/50">—</span>}
                    </td>
                  </tr>
                ))}
              <tr className="border-t-2 border-[var(--color-muted)]/40 font-semibold text-[var(--color-text)]">
                <td className="py-2 pr-2 text-left">Total riel (W)</td>
                <td className="py-2 px-2 text-right tabular-nums text-[var(--color-accent)]">
                  {rail12}
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-amber-400">{rail5}</td>
                <td className="py-2 pl-2 text-right tabular-nums text-sky-400">{rail3v3}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 font-mono text-xs text-[var(--color-muted)]">
            5V y 3.3V son informativos — no cambian la fuente recomendada.
          </p>
        </div>
      )}
    </div>
  );
}
