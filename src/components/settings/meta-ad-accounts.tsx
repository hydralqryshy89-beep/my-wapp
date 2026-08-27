"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMetaAccountStatus } from "@/lib/meta/format";

type FetchAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;
type AssignAction = (adAccountId: string, prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

interface AdAccountRow {
  id: string;
  accountName: string;
  metaAccountId: string;
  currency: string | null;
  status: string | null;
  brandId: string | null;
}

export function MetaAdAccounts({
  accounts,
  brands,
  fetchAction,
  assignAction,
}: {
  accounts: AdAccountRow[];
  brands: { id: string; name: string }[];
  fetchAction: FetchAction;
  assignAction: AssignAction;
}) {
  const [fetchError, fetchFormAction, fetchPending] = useActionState(fetchAction, undefined);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted">
          الحسابات الإعلانية {accounts.length > 0 && `(${accounts.length})`}
        </p>
        <form action={fetchFormAction}>
          <Button type="submit" variant="outline" size="sm" disabled={fetchPending}>
            <RefreshCw size={14} className={fetchPending ? "animate-spin" : undefined} />
            {fetchPending ? "جاري الجلب..." : "جلب الحسابات الإعلانية"}
          </Button>
        </form>
      </div>

      {fetchError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {fetchError}
        </p>
      )}

      {accounts.length === 0 ? (
        <p className="text-xs text-muted">لا توجد حسابات إعلانية مجلوبة بعد. اضغط &quot;جلب الحسابات الإعلانية&quot;.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            // Keyed on brandId too: an uncontrolled <select defaultValue> only reads its
            // defaultValue on mount, so without this the row would keep showing whatever
            // was last picked in the browser instead of the freshly-saved server value
            // after another row's action triggers a shared revalidatePath re-render.
            <AdAccountRow key={`${account.id}-${account.brandId ?? "none"}`} account={account} brands={brands} assignAction={assignAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdAccountRow({
  account,
  brands,
  assignAction,
}: {
  account: AdAccountRow;
  brands: { id: string; name: string }[];
  assignAction: AssignAction;
}) {
  const [error, formAction, pending] = useActionState(assignAction.bind(null, account.id), undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
      <div className="min-w-40 flex-1">
        <p className="font-medium text-foreground">{account.accountName}</p>
        <p className="text-xs text-muted" dir="ltr">
          act_{account.metaAccountId} · {account.currency ?? "—"} · {formatMetaAccountStatus(account.status)}
        </p>
      </div>
      <select
        name="brandId"
        defaultValue={account.brandId ?? ""}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        <option value="">بدون ربط</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : "حفظ"}
      </Button>
      {error && (
        <p className="w-full rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
