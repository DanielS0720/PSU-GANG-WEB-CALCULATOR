import type { PsuModel } from "@/types/components";
import type { CalculationResult } from "@/lib/calculator";
import { checkPsuAdequacy, wattBaseline, tierLabel } from "@/lib/psuModels";

interface AdequacyAlertProps {
  model: PsuModel;
  result: CalculationResult;
}

// Adequacy verdict for the user's own PSU vs the build. Green when adequate,
// orange with one line per failing check otherwise. Callers render this only
// when a model is selected and result.tier is set.
export function AdequacyAlert({ model, result }: AdequacyAlertProps) {
  const { tierOk, wattsOk } = checkPsuAdequacy(model, result);
  const name = `${model.brand} ${model.model}`;

  if (tierOk && wattsOk) {
    return (
      <div className="mt-4 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">
        ✓ Tu fuente ({name}) es adecuada para este build.
      </div>
    );
  }

  const reasons: string[] = [];
  if (!tierOk) {
    reasons.push(
      `Calidad insuficiente: tu fuente es ${tierLabel(model.tier)} y el build requiere ${
        result.tier ? result.tier.label : ""
      }.`,
    );
  }
  if (!wattsOk) {
    reasons.push(
      `Potencia insuficiente: tu fuente entrega ${model.w} W y se recomiendan ${wattBaseline(
        result,
      )} W.`,
    );
  }

  return (
    <div className="mt-4 rounded-md border border-[var(--color-orange)]/50 bg-[var(--color-orange)]/10 p-3 text-sm text-[var(--color-orange)]">
      <p className="font-semibold">⚠ Tu fuente ({name}) no es adecuada</p>
      <ul className="mt-1 list-disc pl-5 space-y-1">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
