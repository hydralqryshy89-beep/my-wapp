"use client";

import { useActionState } from "react";
import { Award } from "lucide-react";

type Action = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function IssueCertificateButton({ action }: { action: Action }) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Award size={13} />
        {pending ? "جارِ الإصدار..." : "إصدار شهادة"}
      </button>
      {error && <span className="max-w-48 text-xs text-danger">{error}</span>}
    </form>
  );
}
