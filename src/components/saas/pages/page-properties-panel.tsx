"use client";

import { getComponentDefinition, STYLE_PROPERTY_KEYS, type PropertyFieldDef } from "@/lib/saas/page-builder/component-registry";
import { normalizeBindingValue, resolveBindingValue, compatibleFields, type BindingContext } from "@/lib/saas/page-builder/binding-schema";
import type { EditorNode } from "@/lib/saas/page-builder/local-tree-ops";
import type { BindableModelInfo } from "@/actions/saas/data-binding.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";
import { cn } from "@/lib/utils";

function renderStaticControl(
  field: PropertyFieldDef,
  id: string,
  value: unknown,
  onChange: (value: unknown) => void,
  canEdit: boolean
) {
  switch (field.control) {
    case "textarea":
      return <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!canEdit} />;
    case "select":
      return (
        <Select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!canEdit}>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      );
    case "checkbox":
      return (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={!canEdit}
          className="h-4 w-4 rounded border-slate-300"
        />
      );
    case "number":
      return (
        <Input id={id} type="number" value={String(value ?? "")} onChange={(e) => onChange(Number(e.target.value) || 0)} disabled={!canEdit} />
      );
    case "url":
      return <Input id={id} type="url" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!canEdit} />;
    case "color":
      return (
        <Input
          id={id}
          type="color"
          value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canEdit}
          className="h-10 w-full cursor-pointer p-1"
        />
      );
    default:
      return <Input id={id} type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={!canEdit} />;
  }
}

/**
 * Its form controls are generated entirely from the selected node's
 * Component Registry entry — never a per-type hardcoded panel. Every
 * change here updates the Canvas immediately (see use-page-editor-state's
 * `updateProps`/`updateStyles`); persistence follows on a short debounce.
 *
 * Phase 3C: a propertyField carrying a `binding` capability gets a
 * Static/Dynamic toggle instead of always showing its plain control —
 * Dynamic mode adds a Model and Field selector, both scoped to the
 * capability's `compatibleFieldTypes` and to this project's own Data
 * Models (never another project's).
 */
export function PagePropertiesPanel({
  node,
  canEdit,
  bindableModels,
  bindingContext,
  onChangeProps,
  onChangeStyles,
}: {
  node: EditorNode | undefined;
  canEdit: boolean;
  bindableModels: BindableModelInfo[] | null;
  bindingContext: BindingContext;
  onChangeProps: (nodeId: string, props: Record<string, unknown>) => void;
  onChangeStyles: (nodeId: string, styles: Record<string, unknown>) => void;
}) {
  if (!node) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">No component selected.</p>
        </CardContent>
      </Card>
    );
  }

  const definition = getComponentDefinition(node.type);

  function setProp(key: string, value: unknown) {
    onChangeProps(node!.id, { ...node!.props, [key]: value });
  }

  function setStyle(key: string, value: string) {
    const next = { ...node!.styles };
    if (value === "") delete next[key];
    else next[key] = value;
    onChangeStyles(node!.id, next);
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{definition.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {definition.propertyFields.length === 0 && (
          <p className="text-sm text-slate-400">This component has no editable properties.</p>
        )}
        {definition.propertyFields.map((field) => {
          const id = `prop-${field.key}`;
          const capability = field.binding;

          if (!capability) {
            const value = node.props[field.key];
            return (
              <Field key={field.key} label={field.label} htmlFor={id}>
                {renderStaticControl(field, id, value, (v) => setProp(field.key, v), canEdit)}
              </Field>
            );
          }

          const binding = normalizeBindingValue(node.props[field.key]);
          const model = binding.mode === "binding" ? bindableModels?.find((m) => m.id === binding.modelId) : undefined;
          const resolved = resolveBindingValue(capability, binding, bindingContext);

          return (
            <div key={field.key} className="flex flex-col gap-2 rounded-md border border-slate-200 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                <div className="flex gap-0.5 rounded-md border border-slate-200 p-0.5 text-xs">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      setProp(field.key, { mode: "static", value: binding.mode === "static" ? binding.value : "" })
                    }
                    className={cn("rounded px-2 py-0.5", binding.mode === "static" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
                  >
                    Static
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      setProp(
                        field.key,
                        binding.mode === "binding" ? binding : { mode: "binding", source: "record", modelId: "", fieldKey: "" }
                      )
                    }
                    className={cn("rounded px-2 py-0.5", binding.mode === "binding" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
                  >
                    Dynamic
                  </button>
                </div>
              </div>

              {binding.mode === "static" ? (
                renderStaticControl(field, id, binding.value, (v) => setProp(field.key, { mode: "static", value: String(v) }), canEdit)
              ) : (
                <div className="flex flex-col gap-2">
                  <Select
                    aria-label={`${field.label} model`}
                    value={binding.modelId}
                    disabled={!canEdit || !bindableModels}
                    onChange={(e) => setProp(field.key, { mode: "binding", source: "record", modelId: e.target.value, fieldKey: "" })}
                  >
                    <option value="">Choose a data model…</option>
                    {(bindableModels ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={`${field.label} field`}
                    value={binding.fieldKey}
                    disabled={!canEdit || !binding.modelId}
                    onChange={(e) => setProp(field.key, { ...binding, fieldKey: e.target.value })}
                  >
                    <option value="">Choose a field…</option>
                    {compatibleFields(capability, model).map((f) => (
                      <option key={f.id} value={f.key}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                  <p className={cn("text-xs", resolved.invalidReason ? "text-rose-600" : "text-slate-400")}>
                    {resolved.invalidReason ? `⚠ ${resolved.invalidReason}` : `Preview: ${resolved.value || "—"}`}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Styles</p>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PROPERTY_KEYS.map((key) => (
              <Field key={key} label={key} htmlFor={`style-${key}`}>
                <Input
                  id={`style-${key}`}
                  type="text"
                  value={String(node.styles[key] ?? "")}
                  onChange={(e) => setStyle(key, e.target.value)}
                  disabled={!canEdit}
                />
              </Field>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
