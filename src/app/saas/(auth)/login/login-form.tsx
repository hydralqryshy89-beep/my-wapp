"use client";

import { useActionState } from "react";
import { login } from "@/actions/saas/auth.actions";
import { Field, Input } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function LoginForm() {
  const [error, formAction] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      {error && <Alert>{error}</Alert>}

      <SubmitButton pendingLabel="Signing in..." className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
