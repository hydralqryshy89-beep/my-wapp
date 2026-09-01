import { ValidationError } from "@/lib/saas/errors";
import type { FieldType } from "@/lib/saas/data-constants";

export interface DataFieldDef {
  id: string;
  key: string;
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue: unknown;
  options: unknown;
  validation: unknown;
}

export type RecordJson = Record<string, unknown>;

/**
 * Validates and normalizes raw client input against a Data Model's fields
 * before every create/update (see AGENTS.md Phase 2B section 6). Never
 * accepts data blindly: unknown keys are rejected outright.
 *
 * A field that anchors a relation (`relationAnchorKeys`) is passed through
 * here unvalidated by type — its real validation (does the referenced
 * record exist, in the right model, in the right project) happens in
 * data-record.service.ts against SaasDataRelation, which is the source of
 * truth for relation semantics (see section 17/41), not the field's nominal
 * type.
 *
 * - create (`partial: false`): every field is considered. A missing
 *   required field falls back to `defaultValue`, or fails. A missing
 *   optional field is simply omitted from the result (sections 21-23) —
 *   never backfilled with `null`.
 * - update (`partial: true`): only keys actually present in `input` are
 *   validated and returned; the caller merges this into the existing
 *   record. Defaults are never re-applied on update (section 21).
 */
export function validateRecordInput(
  fields: DataFieldDef[],
  input: RecordJson,
  options: { partial: boolean; relationAnchorKeys: ReadonlySet<string> }
): RecordJson {
  const fieldsByKey = new Map(fields.map((f) => [f.key, f]));

  for (const key of Object.keys(input)) {
    if (!fieldsByKey.has(key)) {
      throw new ValidationError(`Unknown field "${key}".`);
    }
  }

  const result: RecordJson = {};

  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(input, field.key);

    if (!hasValue) {
      if (options.partial) continue; // truly untouched — leave the existing value alone
      if (field.required) {
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
          result[field.key] = field.defaultValue;
        } else {
          throw new ValidationError(`"${field.name}" is required.`);
        }
      }
      continue;
    }

    const value = input[field.key];

    // An explicit null means "clear this field" (an empty form control, not
    // a missing key) — see AGENTS.md sections 21-23/73. On create that's the
    // same as never having provided it; on update the caller (see
    // updateDataRecord) deletes the key from the merged record rather than
    // storing a literal null, keeping "has a value" vs "doesn't" unambiguous.
    if (value === null) {
      if (field.required) throw new ValidationError(`"${field.name}" is required.`);
      if (options.partial) result[field.key] = null;
      continue;
    }

    if (options.relationAnchorKeys.has(field.key)) {
      result[field.key] = value;
      continue;
    }

    result[field.key] = validateFieldValue(field, value);
  }

  return result;
}

function validateFieldValue(field: DataFieldDef, rawValue: unknown): unknown {
  switch (field.type as FieldType) {
    case "TEXT":
    case "LONG_TEXT":
      return validateText(field, rawValue);
    case "NUMBER":
    case "CURRENCY":
      return validateNumber(field, rawValue);
    case "BOOLEAN":
      return validateBoolean(field, rawValue);
    case "DATE":
      return validateDate(field, rawValue);
    case "DATETIME":
      return validateDateTime(field, rawValue);
    case "EMAIL":
      return validateEmail(field, rawValue);
    case "PHONE":
      return validatePhone(field, rawValue);
    case "URL":
      return validateUrl(field, rawValue);
    case "SELECT":
      return validateSelect(field, rawValue);
    case "MULTI_SELECT":
      return validateMultiSelect(field, rawValue);
    case "FILE":
      return validateFile(field, rawValue);
    default:
      throw new ValidationError(`Unsupported field type "${field.type}".`);
  }
}

function getValidationConfig(field: DataFieldDef): Record<string, unknown> {
  return field.validation && typeof field.validation === "object" ? (field.validation as Record<string, unknown>) : {};
}

function validateText(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError(`"${field.name}" must be text.`);
  const value = raw.trim();
  const v = getValidationConfig(field);
  if (typeof v.minLength === "number" && value.length < v.minLength) {
    throw new ValidationError(`"${field.name}" must be at least ${v.minLength} characters.`);
  }
  if (typeof v.maxLength === "number" && value.length > v.maxLength) {
    throw new ValidationError(`"${field.name}" must be at most ${v.maxLength} characters.`);
  }
  // Pattern is TEXT-only — LONG_TEXT never supports it (see AGENTS.md section 9).
  if (field.type === "TEXT" && typeof v.pattern === "string") {
    let regex: RegExp;
    try {
      regex = new RegExp(v.pattern);
    } catch {
      throw new ValidationError(`"${field.name}" has an invalid validation pattern.`);
    }
    if (!regex.test(value)) throw new ValidationError(`"${field.name}" does not match the required format.`);
  }
  return value;
}

function validateNumber(field: DataFieldDef, raw: unknown): number {
  const num = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    throw new ValidationError(`"${field.name}" must be a valid number.`);
  }
  const v = getValidationConfig(field);
  if (typeof v.min === "number" && num < v.min) throw new ValidationError(`"${field.name}" must be at least ${v.min}.`);
  if (typeof v.max === "number" && num > v.max) throw new ValidationError(`"${field.name}" must be at most ${v.max}.`);
  return num;
}

function validateBoolean(field: DataFieldDef, raw: unknown): boolean {
  if (typeof raw !== "boolean") throw new ValidationError(`"${field.name}" must be true or false.`);
  return raw;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError(`"${field.name}" must be a date.`);
  const value = raw.trim();
  if (!DATE_ONLY_RE.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new ValidationError(`"${field.name}" must be a valid date (YYYY-MM-DD).`);
  }
  return value;
}

/** Always normalized to a UTC ISO string — never stored relative to the submitting browser's timezone (section 14). */
function validateDateTime(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") {
    throw new ValidationError(`"${field.name}" must be a date and time.`);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`"${field.name}" must be a valid date and time.`);
  return date.toISOString();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError(`"${field.name}" must be an email address.`);
  const value = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(value)) throw new ValidationError(`"${field.name}" must be a valid email address.`);
  return value;
}

/** Stored as-is — never coerced to a number (section 16). */
function validatePhone(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) throw new ValidationError(`"${field.name}" must be a phone number.`);
  return raw.trim();
}

function validateUrl(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError(`"${field.name}" must be a URL.`);
  const value = raw.trim();
  try {
    new URL(value);
  } catch {
    throw new ValidationError(`"${field.name}" must be a valid URL.`);
  }
  return value;
}

// Phase 2A stores `options` as a flat string[] (each value doubles as its own
// label) — kept as-is rather than migrating to {value,label} objects, since
// that would be a Phase 2A UI/schema change this phase must not make.
function getOptionValues(field: DataFieldDef): string[] {
  return Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : [];
}

function validateSelect(field: DataFieldDef, raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError(`"${field.name}" must be one of the available options.`);
  const options = getOptionValues(field);
  if (!options.includes(raw)) throw new ValidationError(`"${field.name}" must be one of: ${options.join(", ")}.`);
  return raw;
}

function validateMultiSelect(field: DataFieldDef, raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
    throw new ValidationError(`"${field.name}" must be a list of options.`);
  }
  const options = getOptionValues(field);
  for (const v of raw) {
    if (!options.includes(v)) throw new ValidationError(`"${field.name}" contains an invalid option: "${v}".`);
  }
  return raw as string[];
}

export interface FileFieldValue {
  url: string;
  name: string;
  size: number;
  type: string;
}

/** Phase 2B stores file metadata/reference only — no upload/storage engine (section 20). */
function validateFile(field: DataFieldDef, raw: unknown): FileFieldValue {
  const v = raw as Partial<FileFieldValue> | null;
  if (
    !v ||
    typeof v !== "object" ||
    typeof v.url !== "string" ||
    !v.url ||
    typeof v.name !== "string" ||
    !v.name ||
    typeof v.size !== "number" ||
    typeof v.type !== "string"
  ) {
    throw new ValidationError(`"${field.name}" must include a file url, name, size, and type.`);
  }
  return { url: v.url, name: v.name, size: v.size, type: v.type };
}
