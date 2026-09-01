// Phase 2A — Data Model Builder: field/relation type catalogs. Kept separate
// from src/lib/saas/constants.ts (RBAC concepts) since this is a distinct
// domain — no other reason for the split.

export const FIELD_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "CURRENCY",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "EMAIL",
  "PHONE",
  "URL",
  "SELECT",
  "MULTI_SELECT",
  "FILE",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long Text",
  NUMBER: "Number",
  CURRENCY: "Currency",
  BOOLEAN: "Boolean",
  DATE: "Date",
  DATETIME: "Date & Time",
  EMAIL: "Email",
  PHONE: "Phone",
  URL: "URL",
  SELECT: "Select",
  MULTI_SELECT: "Multi Select",
  FILE: "File",
};

// Field types that accept a fixed list of choices (see field.options).
export const OPTION_BASED_FIELD_TYPES: readonly FieldType[] = ["SELECT", "MULTI_SELECT"];

// Field types with a simple, editable default value in Phase 2A's UI.
export const TEXT_LIKE_DEFAULT_FIELD_TYPES: readonly FieldType[] = [
  "TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "URL",
];
export const NUMERIC_FIELD_TYPES: readonly FieldType[] = ["NUMBER", "CURRENCY"];

// RELATION is intentionally not a FIELD_TYPES entry — relations are modeled
// via SaasDataRelation, never as a standalone field type (see AGENTS.md
// Phase 2A section 7).
export const RELATION_TYPES = ["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  ONE_TO_ONE: "One to One",
  ONE_TO_MANY: "One to Many",
  MANY_TO_ONE: "Many to One",
  MANY_TO_MANY: "Many to Many",
};
