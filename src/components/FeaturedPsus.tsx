import Image from "next/image";
import type { PsuModel } from "@/types/components";
import type { CalculationResult } from "@/lib/calculator";
import { featuredPsus, tierLabel } from "@/lib/psuModels";
import psuModelsData from "@/data/psu-models.json";

const psuModels = psuModelsData as PsuModel[];

interface FeaturedPsusProps {
  result: CalculationResult;
}

// Up to 4 PSU models compatible with the calculated build, sponsored first.
// Hidden when the build has no tier; shows an empty state when nothing fits.
export function FeaturedPsus({ result }: FeaturedPsusProps) {
  if (!result.tier) return null;

  const models = featuredPsus(result, psuModels);

  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-widest text-[var(--color-muted)] mb-4">
        Fuentes recomendadas para tu build
      </h2>

      {models.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Sin modelos para este consumo.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((m) => (
            <article
              key={m.id}
              className="rounded-lg border border-[var(--color-surface)] p-4 text-center"
            >
              <div className="relative mx-auto mb-3 aspect-square w-full max-w-[160px] overflow-hidden rounded-md bg-[var(--color-surface)]">
                {m.image ? (
                  <Image
                    src={m.image}
                    alt={`${m.brand} ${m.model}`}
                    width={160}
                    height={160}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)] text-2xl font-semibold">
                    {m.brand.charAt(0)}
                  </div>
                )}
              </div>

              {m.sponsorRank && m.sponsorRank > 0 ? (
                <span className="mb-1 inline-block rounded bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
                  Destacado
                </span>
              ) : null}

              <p className="text-sm font-semibold text-[var(--color-text)]">
                {m.brand} {m.model}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {m.w} W · {tierLabel(m.tier)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
