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
