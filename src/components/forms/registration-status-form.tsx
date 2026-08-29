"use client";

import { useActionState } from "react";
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS } from "@/lib/constants";

type Action = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function RegistrationStatusForm({ action, defaultStatus }: { action: Action; defaultStatus: string }) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <select
        name="status"
        defaultValue={defaultStatus}
        disabled={pending}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs focus:border-primary focus:outline-none"
      >
        {REGISTRATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {REGISTRATION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-muted-surface px-2 py-1 text-xs font-semibold hover:bg-border disabled:opacity-50"
      >
        حفظ
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
