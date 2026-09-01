"use client";

import { useState, type FormEvent } from "react";
import { getComponentDefinition, STYLE_PROPERTY_KEYS } from "@/lib/saas/page-builder/component-registry";
import type { FlatPageNode } from "@/lib/saas/page-builder/build-tree";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";
import { Button } from "@/components/saas/ui/button";

/** Its form controls are generated entirely from the selected node's Component Registry entry — never a per-type hardcoded panel. */
export function PagePropertiesPanel({
  node,
  canEdit,
  onSave,
}: {
  node: FlatPageNode;
  canEdit: boolean;
  onSave: (props: Record<string, unknown>, styles: Record<string, unknown>) => void;
}) {
  const definition = getComponentDefinition(node.type);
  const initialProps = (node.props ?? {}) as Record<string, unknown>;
  const initialStyles = (node.styles ?? {}) as Record<string, unknown>;

  const [props, setProps] = useState<Record<string, unknown>>(initialProps);
  const [styles, setStyles] = useState<Record<string, string>>(
    Object.fromEntries(STYLE_PROPERTY_KEYS.map((key) => [key, String(initialStyles[key] ?? "")]))
  );

  function setProp(key: string, value: unknown) {
    setProps((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanedStyles = Object.fromEntries(Object.entries(styles).filter(([, value]) => value !== ""));
    const cleanedProps = { ...props };
    for (const field of definition.propertyFields) {
      if (field.control === "number") cleanedProps[field.key] = Number(props[field.key]) || 0;
    }
    onSave(cleanedProps, cleanedStyles);
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{definition.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {definition.propertyFields.length === 0 && (
            <p className="text-sm text-slate-400">This component has no editable properties.</p>
          )}
          {definition.propertyFields.map((field) => (
            <Field key={field.key} label={field.label} htmlFor={`prop-${field.key}`}>
              {field.control === "textarea" ? (
                <Textarea
                  id={`prop-${field.key}`}
                  value={String(props[field.key] ?? "")}
                  onChange={(e) => setProp(field.key, e.target.value)}
                  disabled={!canEdit}
                />
              ) : field.control === "select" ? (
                <Select
                  id={`prop-${field.key}`}
                  value={String(props[field.key] ?? "")}
                  onChange={(e) => setProp(field.key, e.target.value)}
                  disabled={!canEdit}
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : field.control === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(props[field.key])}
                  onChange={(e) => setProp(field.key, e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300"
                />
              ) : field.control === "number" ? (
                <Input
                  id={`prop-${field.key}`}
                  type="number"
                  value={String(props[field.key] ?? "")}
                  onChange={(e) => setProp(field.key, e.target.value)}
                  disabled={!canEdit}
                />
              ) : (
                <Input
                  id={`prop-${field.key}`}
                  type="text"
                  value={String(props[field.key] ?? "")}
                  onChange={(e) => setProp(field.key, e.target.value)}
                  disabled={!canEdit}
                />
              )}
            </Field>
          ))}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Styles</p>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PROPERTY_KEYS.map((key) => (
                <Field key={key} label={key} htmlFor={`style-${key}`}>
                  <Input
                    id={`style-${key}`}
                    type="text"
                    value={styles[key] ?? ""}
                    onChange={(e) => setStyles((prev) => ({ ...prev, [key]: e.target.value }))}
                    disabled={!canEdit}
                  />
                </Field>
              ))}
            </div>
          </div>

          {canEdit && <Button type="submit">Save</Button>}
        </form>
      </CardContent>
    </Card>
  );
}
