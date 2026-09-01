"use client";

import { useActionState } from "react";
import { createDataModelAction } from "@/actions/saas/data-model.actions";
import { Field, Input, Textarea } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function CreateDataModelForm({ projectId }: { projectId: string }) {
  const action = createDataModelAction.bind(null, projectId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="model-name" required hint='e.g. "Students", "Courses"'>
        <Input id="model-name" name="name" type="text" required placeholder="Students" />
      </Field>
      <Field label="Icon" htmlFor="model-icon" hint="A single emoji, optional.">
        <Input id="model-icon" name="icon" type="text" maxLength={4} placeholder="🎓" />
      </Field>
      <Field label="Description" htmlFor="model-description" hint="Optional.">
        <Textarea id="model-description" name="description" placeholder="What does this data model store?" />
      </Field>

      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Creating...">Create Data Model</SubmitButton>
      </div>
    </form>
  );
}
