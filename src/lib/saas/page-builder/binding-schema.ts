import { z } from "zod";
import type { FieldType } from "@/lib/saas/data-constants";

/**
 * Phase 3C — Data Binding Foundation. A bindable prop (TEXT.text,
 * HEADING.text, IMAGE.src, BUTTON.text/href, ...) accepts either a plain
 * string (the Phase 3A/3B shape — a static value, kept forever for
 * backward compatibility) or a BindingDefinition object. Nothing in this
 * file touches the database, and nothing here depends on the Component
 * Registry — kept separate so the Registry can depend on this file (for
 * `bindableValueSchema`/`BindingCapability`) without a cycle.
 */

export const BINDING_MODES = ["static", "binding"] as const;
export type BindingMode = (typeof BINDING_MODES)[number];

export interface StaticBinding {
  mode: "static";
  value: string;
}

export interface DynamicBinding {
  mode: "binding";
  source: "record";
  /** Empty until the user has picked one — an incomplete-but-well-shaped binding is always safe to store. */
  modelId: string;
  fieldKey: string;
}

export type BindingDefinition = StaticBinding | DynamicBinding;

export const staticBindingSchema: z.ZodType<StaticBinding> = z.object({ mode: z.literal("static"), value: z.string().max(2000) }).strict();
export const dynamicBindingSchema: z.ZodType<DynamicBinding> = z
  .object({
    mode: z.literal("binding"),
    source: z.literal("record"),
    modelId: z.string().max(200),
    fieldKey: z.string().max(200),
  })
  .strict();
export const bindingDefinitionSchema: z.ZodType<BindingDefinition> = z.union([staticBindingSchema, dynamicBindingSchema]);

/** A bindable prop's stored shape: the legacy plain string, or a full BindingDefinition — never anything else, and never a mix of the two (see AGENTS.md Phase 3C section 3). */
export function bindableValueSchema(maxLength: number) {
  return z.union([z.string().trim().max(maxLength), bindingDefinitionSchema]);
}

/** Every consumer downstream of storage only ever deals with this one normalized shape. */
export function normalizeBindingValue(raw: unknown, staticFallback = ""): BindingDefinition {
  if (typeof raw === "string") return { mode: "static", value: raw };
  const parsed = bindingDefinitionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { mode: "static", value: staticFallback };
}

export type BindingKind = "text" | "image" | "url";

/** Declared per-propertyField in the Component Registry — which kind of value this prop needs, and which Data Field types are meaningful to bind it to. */
export interface BindingCapability {
  kind: BindingKind;
  compatibleFieldTypes: readonly FieldType[];
}

export interface BindingContextModel {
  id: string;
  name: string;
  fields: { id: string; key: string; name: string; type: string }[];
}

/**
 * Everything the pure resolver needs, gathered ahead of time at a
 * controlled boundary (page load, model/field pick, Preview) — never
 * fetched during render, hover, drag, or a keystroke.
 *
 * `records[modelId]`: `undefined` = not fetched yet (still show a neutral
 * placeholder), `null` = fetched and confirmed the model has no records,
 * an object = the record's `data` to read fields from.
 */
export interface BindingContext {
  modelsLoaded: boolean;
  models: Record<string, BindingContextModel>;
  records: Record<string, Record<string, unknown> | null | undefined>;
}

export const EMPTY_BINDING_CONTEXT: BindingContext = { modelsLoaded: false, models: {}, records: {} };

export interface ResolvedBindingValue {
  /** true for any non-final value (still loading, unset, or a broken binding) — never treat it as real data. */
  isPlaceholder: boolean;
  value: string;
  invalidReason?: string;
}

function formatFieldValue(type: string, raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  switch (type) {
    case "BOOLEAN":
      return raw ? "Yes" : "No";
    case "DATE": {
      const d = new Date(String(raw));
      return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
    }
    case "DATETIME": {
      const d = new Date(String(raw));
      return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
    }
    case "MULTI_SELECT":
      return Array.isArray(raw) ? raw.join(", ") : String(raw);
    case "FILE": {
      if (raw && typeof raw === "object" && "url" in (raw as Record<string, unknown>)) {
        return String((raw as { url: unknown }).url ?? "");
      }
      return String(raw);
    }
    default:
      return String(raw);
  }
}

/** Blocks `javascript:`/`data:`-style URLs from ever reaching an href — a Data Field's value is untrusted user data, not code. */
function safeHref(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "#";
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

function placeholderFor(kind: BindingKind, binding: DynamicBinding): string {
  if (kind === "image") return "";
  if (!binding.fieldKey) return kind === "url" ? "#" : "";
  return `{${binding.fieldKey}}`;
}

function invalidPlaceholder(kind: BindingKind): string {
  return kind === "text" ? "⚠ Field no longer exists" : kind === "url" ? "#" : "";
}

/** Resolves one BindingDefinition to a plain, render-ready value. Never throws — an invalid or not-yet-loaded binding degrades to a clear placeholder instead. */
export function resolveBindingValue(capability: BindingCapability, binding: BindingDefinition, context: BindingContext): ResolvedBindingValue {
  if (binding.mode === "static") {
    return { value: capability.kind === "url" ? safeHref(binding.value) : binding.value, isPlaceholder: false };
  }

  if (!binding.modelId || !binding.fieldKey) {
    return { value: placeholderFor(capability.kind, binding), isPlaceholder: true };
  }

  const model = context.models[binding.modelId];
  if (!model) {
    if (!context.modelsLoaded) return { value: placeholderFor(capability.kind, binding), isPlaceholder: true };
    return { value: invalidPlaceholder(capability.kind), isPlaceholder: true, invalidReason: "The linked data model no longer exists." };
  }

  const field = model.fields.find((f) => f.key === binding.fieldKey);
  if (!field) {
    return { value: invalidPlaceholder(capability.kind), isPlaceholder: true, invalidReason: "The linked field no longer exists." };
  }
  if (!(capability.compatibleFieldTypes as readonly string[]).includes(field.type)) {
    return {
      value: invalidPlaceholder(capability.kind),
      isPlaceholder: true,
      invalidReason: `"${field.name}" (${field.type}) isn't compatible with this component anymore.`,
    };
  }

  const record = context.records[binding.modelId];
  if (record === undefined) return { value: placeholderFor(capability.kind, binding), isPlaceholder: true };
  if (record === null) return { value: capability.kind === "text" ? "No preview data" : placeholderFor(capability.kind, binding), isPlaceholder: true };

  const formatted = formatFieldValue(field.type, record[field.key]);
  return { value: capability.kind === "url" ? safeHref(formatted) : formatted, isPlaceholder: false };
}

/** Which Data Fields on `model` are actually usable for this bindable prop — the Model/Field selectors and the server-side save-time check both call this same function so they can never disagree. */
export function compatibleFields(capability: BindingCapability, model: BindingContextModel | undefined): BindingContextModel["fields"] {
  if (!model) return [];
  return model.fields.filter((f) => (capability.compatibleFieldTypes as readonly string[]).includes(f.type));
}
