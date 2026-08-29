"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { LogoPicker } from "@/components/settings/logo-picker";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";

type UserAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function UserForm({
  action,
  submitLabel,
  defaultName = "",
  defaultEmail = "",
  defaultRole = "STAFF",
  defaultAvatar = null,
  passwordRequired,
  dashed,
}: {
  action: UserAction;
  submitLabel: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultRole?: string;
  defaultAvatar?: string | null;
  passwordRequired?: boolean;
  dashed?: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-2 rounded-lg border p-3 ${dashed ? "border-dashed border-border" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <LogoPicker name="avatarFile" defaultLogo={defaultAvatar} size="sm" shape="circle" />
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder={dashed ? "اسم العضو" : undefined}
          className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          placeholder={dashed ? "البريد الإلكتروني" : undefined}
          dir="ltr"
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue={defaultRole}
          className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {USER_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <input
          name="password"
          type="password"
          required={passwordRequired}
          placeholder={passwordRequired ? "كلمة مرور (8 أحرف على الأقل)" : "كلمة مرور جديدة (اتركه فارغاً لعدم التغيير)"}
          dir="ltr"
          className="min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
