"use client";

import { getComponentDefinition, STYLE_PROPERTY_KEYS } from "@/lib/saas/page-builder/component-registry";
import type { EditorNode } from "@/lib/saas/page-builder/local-tree-ops";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";

/**
 * Its form controls are generated entirely from the selected node's
 * Component Registry entry — never a per-type hardcoded panel. Every
 * change here updates the Canvas immediately (see use-page-editor-state's
 * `updateProps`/`updateStyles`); persistence follows on a short debounce.
 */
export function PagePropertiesPanel({
  node,
  canEdit,
  onChangeProps,
  onChangeStyles,
}: {
  node: EditorNode | undefined;
  canEdit: boolean;
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
          const value = node.props[field.key];
          const id = `prop-${field.key}`;
          return (
            <Field key={field.key} label={field.label} htmlFor={id}>
              {field.control === "textarea" ? (
                <Textarea id={id} value={String(value ?? "")} onChange={(e) => setProp(field.key, e.target.value)} disabled={!canEdit} />
              ) : field.control === "select" ? (
                <Select id={id} value={String(value ?? "")} onChange={(e) => setProp(field.key, e.target.value)} disabled={!canEdit}>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : field.control === "checkbox" ? (
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => setProp(field.key, e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300"
                />
              ) : field.control === "number" ? (
                <Input
                  id={id}
                  type="number"
                  value={String(value ?? "")}
                  onChange={(e) => setProp(field.key, Number(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              ) : field.control === "url" ? (
                <Input id={id} type="url" value={String(value ?? "")} onChange={(e) => setProp(field.key, e.target.value)} disabled={!canEdit} />
              ) : field.control === "color" ? (
                <Input
                  id={id}
                  type="color"
                  value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
                  onChange={(e) => setProp(field.key, e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-full cursor-pointer p-1"
                />
              ) : (
                <Input id={id} type="text" value={String(value ?? "")} onChange={(e) => setProp(field.key, e.target.value)} disabled={!canEdit} />
              )}
            </Field>
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
