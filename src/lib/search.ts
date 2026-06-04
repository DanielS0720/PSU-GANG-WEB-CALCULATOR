// Pure text-matching helpers for the searchable comboboxes.

/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when `query` appears as a contiguous substring of `searchText`,
 * both normalized. Empty query matches everything.
 *
 * Pickers build `searchText` as `brand model family` so brand and model are
 * adjacent: that lets "AMD Ryzen" match across to the model while keeping a
 * tier like "AMD Ryzen 5" from matching "AMD Ryzen 7 ...". The trailing family
 * still enables series search (e.g. "RTX 50").
 */
export function matches(searchText: string, query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  return normalize(searchText).includes(q);
}
