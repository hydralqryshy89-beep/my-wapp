"use client";

import { useActionState } from "react";
import { createPageAction } from "@/actions/saas/page.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function CreatePageForm({ projectId }: { projectId: string }) {
  const action = createPageAction.bind(null, projectId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="page-name" required hint='e.g. "Home", "Students"'>
        <Input id="page-name" name="name" type="text" required placeholder="Home" />
      </Field>

      {error && <Alert>{error}</Alert>}
      <div>
        <SubmitButton pendingLabel="Creating...">Create Page</SubmitButton>
      </div>
    </form>
  );
}
