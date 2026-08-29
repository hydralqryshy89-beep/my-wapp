"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstructorAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function InstructorForm({
  action,
  submitLabel,
  defaultName = "",
  defaultPhone = "",
  defaultSpecialty = "",
  dashed,
}: {
  action: InstructorAction;
  submitLabel: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultSpecialty?: string;
  dashed?: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-2 rounded-lg border p-3", dashed ? "border-dashed border-border" : "border-border")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder="اسم المدرب"
          className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          name="phone"
          defaultValue={defaultPhone}
          placeholder="رقم الهاتف"
          dir="ltr"
          className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          name="specialty"
          defaultValue={defaultSpecialty}
          placeholder="التخصص"
          className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
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
