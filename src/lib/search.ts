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
 */
export function matches(searchText: string, query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  return normalize(searchText).includes(q);
}
