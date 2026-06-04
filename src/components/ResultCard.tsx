import type { CalculationResult } from "@/lib/calculator";
import { TierImage } from "./TierImage";

interface ResultCardProps {
  result: CalculationResult | null;
}

// Recommended PSU + tier in a single card. Shown after the user presses Calcular.
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

  const { baseWatts, totalWatts, recommendedPsu, tier } = result;
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

      <div className="mt-6 mx-auto w-full max-w-[260px]">
        {tier ? (
          <>
            <TierImage src={tier.image} alt={tier.label} />
            <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
              {tier.label}
            </p>
          </>
        ) : (
          <div className="aspect-square rounded-md border border-dashed border-[var(--color-muted)]/40 flex items-center justify-center text-xs text-[var(--color-muted)]">
            Sin tier asignado
          </div>
        )}
      </div>
    </div>
  );
}
