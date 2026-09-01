"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createDataFieldAction, updateDataFieldAction } from "@/actions/saas/data-field.actions";
import { FIELD_TYPES, FIELD_TYPE_LABELS, OPTION_BASED_FIELD_TYPES, NUMERIC_FIELD_TYPES, type FieldType } from "@/lib/saas/data-constants";
import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";
import { SubmitButton, Button } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

interface ExistingField {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue: unknown;
  options: unknown;
  validation: unknown;
  settings: unknown;
}

const TEXT_LIKE: readonly string[] = ["TEXT", "LONG_TEXT", "EMAIL", "PHONE", "URL"];

export function FieldFormPanel({
  projectId,
  modelId,
  mode,
  existingField,
  onCancel,
  onSaved,
}: {
  projectId: string;
  modelId: string;
  mode: "create" | "edit";
  existingField?: ExistingField;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const action =
    mode === "create"
      ? createDataFieldAction.bind(null, projectId, modelId)
      : updateDataFieldAction.bind(null, projectId, modelId, existingField!.id);
  const [error, formAction, isPending] = useActionState(action, undefined);
  const [type, setType] = useState<FieldType>((existingField?.type as FieldType) ?? "TEXT");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && error === undefined) onSaved();
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, error]);

  const existingOptions = Array.isArray(existingField?.options) ? (existingField!.options as string[]) : [];
  const existingValidation = (existingField?.validation ?? {}) as Record<string, number>;
  const existingSettings = (existingField?.settings ?? {}) as { description?: string };
  const existingDefault = existingField?.defaultValue;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Field name" htmlFor="field-name" required>
          <Input id="field-name" name="name" type="text" required defaultValue={existingField?.name} placeholder="Full Name" />
        </Field>
        <Field label="Type" htmlFor="field-type" required>
          <Select id="field-type" name="type" required value={type} onChange={(e) => setType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {existingField && (
        <p className="text-xs text-slate-500">
          Key: <code className="rounded bg-slate-200 px-1 py-0.5">{existingField.key}</code> (cannot be changed)
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="required" defaultChecked={existingField?.required} className="h-4 w-4 rounded border-slate-300" />
          Required
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="unique" defaultChecked={existingField?.unique} className="h-4 w-4 rounded border-slate-300" />
          Unique
        </label>
      </div>

      {OPTION_BASED_FIELD_TYPES.includes(type) && (
        <Field label="Options" htmlFor="field-options" required hint="One option per line.">
          <Textarea id="field-options" name="options" defaultValue={existingOptions.join("\n")} placeholder={"Active\nInactive\nPending"} />
        </Field>
      )}

      {type === "BOOLEAN" ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="defaultValue" defaultChecked={existingDefault === true} className="h-4 w-4 rounded border-slate-300" />
          Default value: on
        </label>
      ) : (
        (TEXT_LIKE.includes(type) || NUMERIC_FIELD_TYPES.includes(type)) && (
          <Field label="Default value" htmlFor="field-default" hint="Optional.">
            <Input
              id="field-default"
              name="defaultValue"
              type={NUMERIC_FIELD_TYPES.includes(type) ? "number" : "text"}
              defaultValue={typeof existingDefault === "string" || typeof existingDefault === "number" ? existingDefault : ""}
            />
          </Field>
        )
      )}

      {(type === "TEXT" || type === "LONG_TEXT") && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min length" htmlFor="field-min-length">
            <Input id="field-min-length" name="validationMinLength" type="number" min={0} defaultValue={existingValidation.minLength ?? ""} />
          </Field>
          <Field label="Max length" htmlFor="field-max-length">
            <Input id="field-max-length" name="validationMaxLength" type="number" min={0} defaultValue={existingValidation.maxLength ?? ""} />
          </Field>
        </div>
      )}

      {NUMERIC_FIELD_TYPES.includes(type) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min value" htmlFor="field-min">
            <Input id="field-min" name="validationMin" type="number" defaultValue={existingValidation.min ?? ""} />
          </Field>
          <Field label="Max value" htmlFor="field-max">
            <Input id="field-max" name="validationMax" type="number" defaultValue={existingValidation.max ?? ""} />
          </Field>
        </div>
      )}

      <Field label="Description" htmlFor="field-description" hint="Optional.">
        <Textarea id="field-description" name="description" defaultValue={existingSettings.description ?? ""} />
      </Field>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-2">
        <SubmitButton pendingLabel={mode === "create" ? "Adding..." : "Saving..."}>
          {mode === "create" ? "Add Field" : "Save Field"}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
