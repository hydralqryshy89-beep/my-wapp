"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function MetaCampaignSyncButton({
  action,
  label = "مزامنة الحملات الآن",
  pendingLabel = "جاري المزامنة...",
}: {
  action: SyncAction;
  label?: string;
  pendingLabel?: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <RefreshCw size={14} className={pending ? "animate-spin" : undefined} />
          {pending ? pendingLabel : label}
        </Button>
      </form>
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
