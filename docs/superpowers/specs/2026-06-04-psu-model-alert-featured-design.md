# PSU Model Alert + Featured Models — Design

Date: 2026-06-04

## Goal

Two features on top of the existing calculator:

1. **Adequacy alert.** The user optionally selects the PSU model they own. After
   calculating, warn them if that PSU is inadequate for the build — either
   because its quality tier is worse than the build requires, or because its
   wattage does not cover the recommended PSU.
2. **Featured models.** After calculating, show up to 4 real PSU models that are
   compatible with the build (adequate tier and wattage), with sponsored models
   listed first.

Both features read from the same new dataset of real PSU models.

## Non-goals

- No backend / API. The dataset ships as static JSON; ~700 rows (~55KB) is
  trivial to filter client-side, reusing the existing typeahead pattern.
- No price, efficiency rating, or purchase links in v1 (the source doc only has
  brand, model, tier, watts). These can be added later without redesign.
- No automated scraping. The model list is converted once from the user's
  existing document.

## Data

New file `src/data/psu-models.json`, an array of:

```json
{ "id": "corsair-rm850x", "brand": "Corsair", "model": "RM850x", "w": 850, "tier": "tier-a", "image": "/psus/corsair-rm850x.webp", "sponsorRank": 0 }
```

- `id` — stable kebab-case slug (`<brand>-<model>`), unique.
- `brand`, `model` — display strings.
- `w` — rated wattage (integer).
- `tier` — one of the existing tier ids in `tiers.json` (`tier-s` … `tier-f`).
- `image` — optional path to a product image under `/public` (e.g.
  `/psus/<id>.webp`), following the `/public/tiers` and `/public/logo`
  convention. Absent/missing → a placeholder is shown.
- `sponsorRank` — optional integer. Absent or `0` = normal placement. A value
  `> 0` marks a sponsored model that sorts ahead of non-sponsored ones; a lower
  positive rank sorts higher. This is the monetization lever — editing the JSON
  changes ordering without code changes.

**Images.** Any model can surface as featured, so each eventually needs an
image; this is a separate curation effort that does not block the code. Start
with a shared placeholder and add real images (sponsored / popular first).

New `PsuModel` interface in `src/types/components.ts`.

**Tier ranking.** `tiers.json` is already ordered best→worst (Tier S … Tier F).
The array index is the rank: lower index = better quality. No new field is
added; a helper derives `rank(tierId)` from the array position. A model whose
tier is not found ranks as worst (defensive).

**Conversion.** The user supplies the source document; we parse it once into
`psu-models.json` during implementation. Format is confirmed at that step.

## Adequacy logic

A new pure function in `src/lib/calculator.ts`, independent of `calculate`:

```
checkPsuAdequacy(userModel: PsuModel, result: CalculationResult)
  -> { tierOk: boolean; wattsOk: boolean }
```

- `tierOk` = `rank(userModel.tier) <= rank(result.tier.id)` — the user's PSU is
  equal or better quality than the build requires.
- `wattsOk` = `userModel.w >= wattBaseline(result)` where
  `wattBaseline = result.recommendedPsu?.w ?? result.totalWatts`. The recommended
  standard step already includes the 5% tolerance, so a build drawing 660W with a
  recommended 650W step is satisfied by a 650W PSU. When no standard covers the
  build (`recommendedPsu` is `null`, i.e. > 5200W), the baseline falls back to the
  raw `totalWatts`.

When `result.tier` is `null` (no CPU/GPU selected) the function is not called.

Two independent booleans let the UI show a distinct message per failure, or both.

## UI

### PSU selector
- New `PsuPicker` component reusing `Combobox` and `src/lib/search.ts`, matching
  the existing `CpuPicker` / `GpuPicker` pattern.
- Optional. If no model is selected, no adequacy alert is shown; the rest of the
  flow is unchanged.

### Adequacy alert
- Rendered in or beside `ResultCard`, only when a PSU model is selected and a
  tier was computed.
- Adequate (`tierOk && wattsOk`): green confirmation ("Tu fuente es adecuada").
- Otherwise: orange warning listing the failing reason(s):
  - tier insufficient — "La calidad de tu fuente (Tier X) es menor a la
    requerida (Tier Y)".
  - watts insufficient — "Tu fuente (NN W) no cubre los NN W recomendados".

### Featured models
New section below `ResultCard`, shown only when a tier was computed.

1. **Filter (compatible):** `rank(model.tier) <= rank(result.tier.id)` AND
   `model.w >= wattBaseline(result)` (same baseline as the adequacy check).
2. **Sort:** sponsored first (`sponsorRank > 0`, ascending; non-sponsored last),
   then by wattage closest to `wattBaseline` (ascending distance — avoids
   oversizing, matching the "660W build → prefer 650W, not bigger" rule).
3. **Limit:** first 4.
4. **Card:** product image on top (placeholder when `image` is absent), then
   brand + model, wattage, tier badge; a "Destacado" label when `sponsorRank > 0`.

## Edge cases

- No CPU/GPU selected → `result.tier` is `null` → featured section hidden, no
  alert.
- Build > 5200W (`recommendedPsu` is `null`) → baseline is `totalWatts`; filter
  may yield 0 compatible models → show an empty state ("Sin modelos para este
  consumo").
- User PSU model not selected → adequacy alert skipped entirely.
- Model with an unknown `tier` id → ranks worst; never crashes the filter.
- Model with no `image` → shared placeholder; layout unaffected.

## Testing

- `checkPsuAdequacy`: tier-fail only, watts-fail only, both fail, both pass, the
  `recommendedPsu === null` fallback, and the 660/650 tolerance boundary.
- Featured filter/sort: compatibility filtering, sponsored-first ordering,
  closest-watt tiebreak, the 4-item limit, and the empty-result case.
- Tier rank helper: known ids, best/worst ends, unknown id.
