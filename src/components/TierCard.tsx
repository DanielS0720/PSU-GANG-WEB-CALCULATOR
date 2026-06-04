import type { CalculationResult } from "@/lib/calculator";
import { TierImage } from "./TierImage";

interface TierCardProps {
  result: CalculationResult | null;
}

// Tier card: sits to the right of the recommended PSU at the same height. The
// tier is derived from CPU + GPU load only.
export function TierCard({ result }: TierCardProps) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-muted)]/40 bg-[var(--color-surface)] p-6 text-center">
        <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-3">
          Tier
        </span>
        <div className="aspect-square rounded-md border border-dashed border-[var(--color-muted)]/40 flex items-center justify-center text-xs text-[var(--color-muted)]">
          —
        </div>
      </div>
    );
  }

  const { tier } = result;

  return (
    <div className="rounded-lg border border-[var(--color-surface)] bg-[var(--color-surface)] p-6 text-center">
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-3">
        Tier
      </span>
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
  );
}
