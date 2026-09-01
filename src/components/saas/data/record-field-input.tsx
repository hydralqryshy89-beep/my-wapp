import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";
import type { FieldType } from "@/lib/saas/data-constants";

export interface RelationAnchorInfo {
  relationName: string;
  toModelName: string;
  isMulti: boolean;
  options: { id: string; label: string }[];
}

interface FieldLike {
  key: string;
  name: string;
  type: string;
  required: boolean;
  options: unknown;
}

/**
 * Renders the right control for one Data Field's runtime value (section
 * 55-57) — a pure "runtime renderer" for whatever schema Phase 2A already
 * defined, not a form builder. A field that anchors a relation is rendered
 * as a record picker instead of its nominal type, since that's its real
 * runtime meaning (see AGENTS.md section 39/41).
 */
export function RecordFieldInput({
  field,
  defaultValue,
  relationAnchor,
}: {
  field: FieldLike;
  defaultValue: unknown;
  relationAnchor?: RelationAnchorInfo;
}) {
  const htmlId = `field-${field.key}`;

  if (relationAnchor) {
    if (relationAnchor.isMulti) {
      const selected = new Set(Array.isArray(defaultValue) ? defaultValue.map(String) : []);
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required} hint={`Related ${relationAnchor.toModelName} records.`}>
          <input type="hidden" name={`${field.key}__touched`} value="1" />
          <div id={htmlId} className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
            {relationAnchor.options.length === 0 && <p className="text-xs text-slate-400">No records yet.</p>}
            {relationAnchor.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name={`${field.key}[]`}
                  value={opt.id}
                  defaultChecked={selected.has(opt.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
      );
    }
    return (
      <Field label={field.name} htmlFor={htmlId} required={field.required} hint={`A related ${relationAnchor.toModelName} record.`}>
        <Select id={htmlId} name={field.key} required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""}>
          <option value="">None</option>
          {relationAnchor.options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  switch (field.type as FieldType) {
    case "LONG_TEXT":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Textarea id={htmlId} name={field.key} required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
    case "BOOLEAN":
      return (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name={field.key} defaultChecked={defaultValue === true} className="h-4 w-4 rounded border-slate-300" />
          {field.name}
        </label>
      );
    case "NUMBER":
    case "CURRENCY":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input
            id={htmlId}
            name={field.key}
            type="number"
            step="any"
            required={field.required}
            defaultValue={typeof defaultValue === "number" ? defaultValue : undefined}
          />
        </Field>
      );
    case "DATE":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input id={htmlId} name={field.key} type="date" required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
    case "DATETIME":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input
            id={htmlId}
            name={field.key}
            type="datetime-local"
            required={field.required}
            defaultValue={typeof defaultValue === "string" ? toDateTimeLocalValue(defaultValue) : ""}
          />
        </Field>
      );
    case "EMAIL":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input id={htmlId} name={field.key} type="email" required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
    case "PHONE":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input id={htmlId} name={field.key} type="tel" required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
    case "URL":
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input id={htmlId} name={field.key} type="url" required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
    case "SELECT": {
      const options = Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : [];
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Select id={htmlId} name={field.key} required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""}>
            <option value="" disabled={field.required}>
              Choose an option
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
      );
    }
    case "MULTI_SELECT": {
      const options = Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : [];
      const selected = new Set(Array.isArray(defaultValue) ? defaultValue.map(String) : []);
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <input type="hidden" name={`${field.key}__touched`} value="1" />
          <div id={htmlId} className="flex flex-col gap-1 rounded-lg border border-slate-300 p-2">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name={`${field.key}[]`}
                  value={opt}
                  defaultChecked={selected.has(opt)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      );
    }
    case "FILE": {
      const f = (defaultValue ?? {}) as { url?: string; name?: string; size?: number; type?: string };
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required} hint="Paste a file URL — uploads aren't supported yet.">
          <div className="flex flex-col gap-2">
            <Input id={htmlId} name={`${field.key}__url`} type="url" placeholder="https://..." defaultValue={f.url ?? ""} required={field.required} />
            <Input name={`${field.key}__name`} type="text" placeholder="File name" defaultValue={f.name ?? ""} />
            <input type="hidden" name={`${field.key}__size`} value={f.size ?? 0} />
            <input type="hidden" name={`${field.key}__type`} value={f.type ?? "application/octet-stream"} />
          </div>
        </Field>
      );
    }
    case "TEXT":
    default:
      return (
        <Field label={field.name} htmlFor={htmlId} required={field.required}>
          <Input id={htmlId} name={field.key} type="text" required={field.required} defaultValue={typeof defaultValue === "string" ? defaultValue : ""} />
        </Field>
      );
  }
}

function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
