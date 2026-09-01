"use client";

import { useActionState } from "react";
import { createDataRecordAction, updateDataRecordAction } from "@/actions/saas/data-record.actions";
import { RecordFieldInput, type RelationAnchorInfo } from "@/components/saas/data/record-field-input";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";
import type { RecordJson } from "@/lib/saas/record-validation";

interface FieldDef {
  id: string;
  key: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue: unknown;
  options: unknown;
}

export function RecordForm({
  projectId,
  modelId,
  fields,
  relationAnchors,
  mode,
  existingData,
  recordId,
}: {
  projectId: string;
  modelId: string;
  fields: FieldDef[];
  relationAnchors: Record<string, RelationAnchorInfo>;
  mode: "create" | "edit";
  existingData?: RecordJson;
  recordId?: string;
}) {
  const action =
    mode === "create"
      ? createDataRecordAction.bind(null, projectId, modelId)
      : updateDataRecordAction.bind(null, projectId, modelId, recordId!);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.map((field) => (
        <RecordFieldInput
          key={field.id}
          field={field}
          defaultValue={
            existingData
              ? existingData[field.key]
              : field.defaultValue !== null && field.defaultValue !== undefined
                ? field.defaultValue
                : undefined
          }
          relationAnchor={relationAnchors[field.key]}
        />
      ))}
      {fields.length === 0 && <p className="text-sm text-slate-500">This data model has no fields yet.</p>}
      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel={mode === "create" ? "Creating..." : "Saving..."}>
          {mode === "create" ? "Create Record" : "Save Record"}
        </SubmitButton>
      </div>
    </form>
  );
}
