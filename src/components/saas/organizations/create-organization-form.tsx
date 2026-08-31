"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/actions/saas/organization.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function CreateOrganizationForm() {
  const [error, formAction] = useActionState(createOrganizationAction, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Organization name" htmlFor="org-name" required>
        <Input id="org-name" name="name" type="text" required placeholder="Acme Inc." />
      </Field>
      {error && <Alert>{error}</Alert>}
      <SubmitButton pendingLabel="Creating...">Create workspace</SubmitButton>
    </form>
  );
}
