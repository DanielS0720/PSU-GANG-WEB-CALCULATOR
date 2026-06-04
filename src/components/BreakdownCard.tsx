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
