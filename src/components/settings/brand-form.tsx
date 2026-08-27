"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { LogoPicker } from "@/components/settings/logo-picker";

type BrandAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function BrandForm({
  action,
  submitLabel,
  defaultName = "",
  defaultLogo = null,
  dashed,
}: {
  action: BrandAction;
  submitLabel: string;
  defaultName?: string;
  defaultLogo?: string | null;
  dashed?: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-2 rounded-lg border p-3 ${dashed ? "border-dashed border-border" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder={dashed ? "اسم براند جديد" : undefined}
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <LogoPicker name="logoFile" defaultLogo={defaultLogo} size="sm" />
        <Button type="submit" size="sm" variant={dashed ? "primary" : "outline"} disabled={pending}>
          {pending ? "..." : submitLabel}
        </Button>
      </div>
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
