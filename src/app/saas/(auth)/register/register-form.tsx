"use client";

import { useActionState } from "react";
import { register } from "@/actions/saas/auth.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function RegisterForm() {
  const [error, formAction] = useActionState(register, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field label="Full name" htmlFor="name" required>
        <Input id="name" name="name" type="text" autoComplete="name" required placeholder="Jane Doe" />
      </Field>
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password" required hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      {error && <Alert>{error}</Alert>}

      <SubmitButton pendingLabel="Creating account..." className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
