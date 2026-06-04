import type { CalculationResult } from "@/lib/calculator";

interface ResultCardProps {
  result: CalculationResult | null;
}

// Recommended PSU card: standard wattage + calculated draw. The tier lives in
// its own TierCard so both sit at the same height in the results row.
export function ResultCard({ result }: ResultCardProps) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-muted)]/40 bg-[var(--color-surface)] p-6 text-center">
        <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-3">
          Potencia recomendada
        </span>
        <p className="font-mono text-sm text-[var(--color-muted)] py-8">
          Configura tu build y presiona{" "}
          <span className="text-[var(--color-accent)]">Calcular</span>.
        </p>
      </div>
    );
  }

  const { baseWatts, totalWatts, recommendedPsu } = result;
  const extraWatts = totalWatts - baseWatts;

  return (
    <div className="rounded-lg border border-[var(--color-surface)] bg-[var(--color-surface)] p-6 text-center">
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-3">
        Fuente recomendada
      </span>
      <div className="font-mono text-4xl font-semibold text-[var(--color-accent)]">
        {recommendedPsu ? `${recommendedPsu.w} W` : "> 5200 W"}
      </div>

      {recommendedPsu?.requires_220v && (
        <p className="mt-2 font-mono text-xs text-yellow-400">
          ⚡ Requiere instalación 220V / 230V
        </p>
      )}
      {!recommendedPsu && (
        <p className="mt-2 font-mono text-xs text-yellow-400">
          El consumo supera el estándar más alto (5200W)
        </p>
      )}

      <p className="mt-3 font-mono text-xs text-[var(--color-muted)]">
        Consumo calculado: {totalWatts} W
        {extraWatts > 0 && ` (${baseWatts} W base + ${extraWatts} W extras)`}
      </p>
    </div>
  );
}
