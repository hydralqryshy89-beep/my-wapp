"use client";

import { useActionState } from "react";
import { updateOrganizationAction } from "@/actions/saas/organization.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function UpdateOrganizationForm({
  organizationId,
  defaultName,
  defaultLogo,
}: {
  organizationId: string;
  defaultName: string;
  defaultLogo: string | null;
}) {
  const action = updateOrganizationAction.bind(null, organizationId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Organization name" htmlFor="org-name" required>
        <Input id="org-name" name="name" type="text" required defaultValue={defaultName} />
      </Field>
      <Field label="Logo URL" htmlFor="org-logo" hint="Optional.">
        <Input id="org-logo" name="logo" type="url" defaultValue={defaultLogo ?? ""} placeholder="https://..." />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}
