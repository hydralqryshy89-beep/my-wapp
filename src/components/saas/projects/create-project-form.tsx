"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/actions/saas/project.actions";
import { Field, Input, Select, Textarea } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function CreateProjectForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [error, formAction] = useActionState(createProjectAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {organizations.length > 1 ? (
        <Field label="Organization" htmlFor="organizationId" required>
          <Select id="organizationId" name="organizationId" required defaultValue="">
            <option value="" disabled>
              Choose an organization
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="organizationId" value={organizations[0]?.id ?? ""} />
      )}

      <Field label="Project name" htmlFor="name" required>
        <Input id="name" name="name" type="text" required placeholder="My Project" />
      </Field>
      <Field label="Icon" htmlFor="icon" hint="A single emoji, optional.">
        <Input id="icon" name="icon" type="text" maxLength={4} placeholder="🚀" />
      </Field>
      <Field label="Description" htmlFor="description" hint="Optional.">
        <Textarea id="description" name="description" placeholder="What is this project for?" />
      </Field>

      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Creating...">Create Project</SubmitButton>
      </div>
    </form>
  );
}
