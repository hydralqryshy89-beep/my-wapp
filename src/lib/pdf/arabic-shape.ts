import ArabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();

/**
 * pdfkit draws glyphs in plain array order with no text-shaping engine, so
 * Arabic script would render as disconnected, logical-order letters. This
 * reshapes each letter to its correct joining form (Arabic Presentation
 * Forms) and reorders the string into visual (left-to-right draw) order per
 * the Unicode Bidi Algorithm — the standard workaround for Arabic in
 * low-level PDF renderers. Numbers/Latin runs embedded in the Arabic text
 * (e.g. a formatted date) are left in their own correct left-to-right order.
 */
export function shapeArabicLine(text: string): string {
  const reshaped: string = ArabicReshaper.convertArabic(text);
  const embeddingLevels = bidi.getEmbeddingLevels(reshaped, "rtl");
  const flips = bidi.getReorderSegments(reshaped, embeddingLevels);

  const chars = Array.from(reshaped);
  for (const [start, end] of flips) {
    let i = start;
    let j = end;
    while (i < j) {
      const tmp = chars[i];
      chars[i] = chars[j];
      chars[j] = tmp;
      i++;
      j--;
    }
  }
  return chars.join("");
}
