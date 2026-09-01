/** Lowercases, strips accents/diacritics, and keeps only [a-z0-9-]. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Appends a short random suffix, used when the base slug is already taken. */
export function withRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug}-${suffix}`;
}

/**
 * Snake_case, database/JSON-key-safe identifier — used for Data Model slugs
 * and Data Field keys (see AGENTS.md Phase 2A sections 35-36), which is a
 * different convention from `slugify` above (hyphenated URL slugs for
 * Organizations/Projects).
 */
export function toSnakeCaseKey(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** Deterministic numbered fallback (student_name, student_name_2, ...) — preferred over a random suffix for keys/slugs users will see and rely on. */
export function withNumericSuffix(base: string, n: number): string {
  return `${base}_${n}`;
}
