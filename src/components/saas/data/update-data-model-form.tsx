"use client";

import { useActionState } from "react";
import { updateDataModelAction } from "@/actions/saas/data-model.actions";
import { Field, Input, Textarea } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function UpdateDataModelForm({
  projectId,
  modelId,
  defaultName,
  defaultDescription,
  defaultIcon,
}: {
  projectId: string;
  modelId: string;
  defaultName: string;
  defaultDescription: string | null;
  defaultIcon: string | null;
}) {
  const action = updateDataModelAction.bind(null, projectId, modelId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="model-name" required>
        <Input id="model-name" name="name" type="text" required defaultValue={defaultName} />
      </Field>
      <Field label="Icon" htmlFor="model-icon" hint="A single emoji, optional.">
        <Input id="model-icon" name="icon" type="text" maxLength={4} defaultValue={defaultIcon ?? ""} />
      </Field>
      <Field label="Description" htmlFor="model-description">
        <Textarea id="model-description" name="description" defaultValue={defaultDescription ?? ""} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}
