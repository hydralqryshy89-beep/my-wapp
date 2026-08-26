"use client";

import { useActionState } from "react";
import { Megaphone } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone size={22} />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">Marketing Plan</div>
            <div className="text-sm text-muted">تسجيل الدخول لإدارة الخطة التسويقية</div>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
          <Field label="البريد الإلكتروني" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
          </Field>
          <Field label="كلمة المرور" htmlFor="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-1 w-full">
            {pending ? "جارِ الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}
