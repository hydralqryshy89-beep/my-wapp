declare module "arabic-reshaper" {
  const ArabicReshaper: {
    convertArabic(text: string): string;
  };
  export default ArabicReshaper;
}

declare module "bidi-js" {
  interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  interface Bidi {
    getEmbeddingLevels(text: string, direction?: "ltr" | "rtl"): EmbeddingLevelsResult;
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number
    ): [number, number][];
    getMirroredCharactersMap(text: string, embeddingLevels: EmbeddingLevelsResult): Map<number, string>;
  }

  export default function bidiFactory(): Bidi;
}
