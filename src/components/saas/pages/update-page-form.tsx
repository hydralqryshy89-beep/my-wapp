"use client";

import { useActionState } from "react";
import { updatePageAction } from "@/actions/saas/page.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function UpdatePageForm({
  projectId,
  pageId,
  defaultName,
}: {
  projectId: string;
  pageId: string;
  defaultName: string;
}) {
  const action = updatePageAction.bind(null, projectId, pageId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="page-name" required>
        <Input id="page-name" name="name" type="text" required defaultValue={defaultName} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}
