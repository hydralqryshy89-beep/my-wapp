"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createDataRelationAction, updateDataRelationAction } from "@/actions/saas/data-relation.actions";
import { RELATION_TYPES, RELATION_TYPE_LABELS } from "@/lib/saas/data-constants";
import { Field, Input, Select } from "@/components/saas/ui/field";
import { SubmitButton, Button } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

interface ModelWithFields {
  id: string;
  name: string;
  fields: { id: string; name: string }[];
}

export function RelationFormPanel({
  projectId,
  modelId,
  currentModel,
  otherModels,
  mode,
  existingRelation,
  onCancel,
  onSaved,
}: {
  projectId: string;
  modelId: string;
  currentModel: ModelWithFields;
  otherModels: ModelWithFields[];
  mode: "create" | "edit";
  existingRelation?: { id: string; name: string; type: string; toModelId: string };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const action =
    mode === "create"
      ? createDataRelationAction.bind(null, projectId, modelId)
      : updateDataRelationAction.bind(null, projectId, modelId, existingRelation!.id);
  const [error, formAction, isPending] = useActionState(action, undefined);
  const [toModelId, setToModelId] = useState(existingRelation?.toModelId ?? otherModels[0]?.id ?? "");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && error === undefined) onSaved();
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, error]);

  const toModel = otherModels.find((m) => m.id === toModelId);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <Field label="Relation name" htmlFor="relation-name" required>
        <Input id="relation-name" name="name" type="text" required defaultValue={existingRelation?.name} placeholder="Course" />
      </Field>

      {mode === "create" ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Related model" htmlFor="relation-to-model" required>
              <Select id="relation-to-model" name="toModelId" required value={toModelId} onChange={(e) => setToModelId(e.target.value)}>
                {otherModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" htmlFor="relation-type" required>
              <Select id="relation-type" name="type" required defaultValue="MANY_TO_ONE">
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RELATION_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Field on ${currentModel.name}`} htmlFor="relation-from-field" required>
              <Select id="relation-from-field" name="fromFieldId" required defaultValue="">
                <option value="" disabled>
                  Choose a field
                </option>
                {currentModel.fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Field on ${toModel?.name ?? "related model"}`} htmlFor="relation-to-field" required>
              <Select id="relation-to-field" name="toFieldId" required defaultValue="">
                <option value="" disabled>
                  Choose a field
                </option>
                {(toModel?.fields ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      ) : (
        <Field label="Type" htmlFor="relation-type" required>
          <Select id="relation-type" name="type" required defaultValue={existingRelation?.type}>
            {RELATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {RELATION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <SubmitButton pendingLabel={mode === "create" ? "Adding..." : "Saving..."}>
          {mode === "create" ? "Add Relation" : "Save Relation"}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
