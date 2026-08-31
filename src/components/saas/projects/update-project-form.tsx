"use client";

import { useActionState } from "react";
import { updateProjectAction } from "@/actions/saas/project.actions";
import { Field, Input, Textarea } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function UpdateProjectForm({
  projectId,
  defaultName,
  defaultDescription,
  defaultIcon,
}: {
  projectId: string;
  defaultName: string;
  defaultDescription: string | null;
  defaultIcon: string | null;
}) {
  const action = updateProjectAction.bind(null, projectId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Project name" htmlFor="project-name" required>
        <Input id="project-name" name="name" type="text" required defaultValue={defaultName} />
      </Field>
      <Field label="Icon" htmlFor="project-icon" hint="A single emoji, optional.">
        <Input id="project-icon" name="icon" type="text" maxLength={4} defaultValue={defaultIcon ?? ""} />
      </Field>
      <Field label="Description" htmlFor="project-description">
        <Textarea id="project-description" name="description" defaultValue={defaultDescription ?? ""} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}
