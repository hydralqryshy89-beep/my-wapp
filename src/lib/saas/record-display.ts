import type { RecordJson } from "@/lib/saas/record-validation";

const PREFERRED_LABEL_TYPES = ["TEXT", "EMAIL", "LONG_TEXT", "PHONE"] as const;

/** A human-friendly label for a record in pickers/relation displays — falls back to the raw id when no text-like field has a value. */
export function computeRecordLabel(fields: { key: string; type: string }[], data: RecordJson, id: string): string {
  for (const type of PREFERRED_LABEL_TYPES) {
    for (const field of fields.filter((f) => f.type === type)) {
      const value = data[field.key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return id;
}
