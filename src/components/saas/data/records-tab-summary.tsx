import { Database, Plus } from "lucide-react";
import { ButtonLink } from "@/components/saas/ui/button";
import { EmptyState } from "@/components/saas/ui/empty-state";

/** The Model Editor's Records tab is a summary + link out to the full list — pagination/search/filter state lives on that page's own URL (section 78-79). */
export function RecordsTabSummary({
  projectId,
  modelId,
  modelName,
  recordCount,
  canView,
  canCreate,
}: {
  projectId: string;
  modelId: string;
  modelName: string;
  recordCount: number;
  canView: boolean;
  canCreate: boolean;
}) {
  if (!canView) {
    return <p className="text-sm text-slate-500">You don&apos;t have permission to view records in this data model.</p>;
  }

  if (recordCount === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No records yet"
        description={`Add your first ${modelName.toLowerCase()} record.`}
        action={
          canCreate && (
            <ButtonLink href={`/saas/projects/${projectId}/data/${modelId}/records/new`} size="sm">
              <Plus size={16} />
              Add {modelName}
            </ButtonLink>
          )
        }
      />
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-5">
      <div>
        <div className="text-2xl font-bold text-slate-900">{recordCount.toLocaleString()}</div>
        <div className="text-sm text-slate-500">{recordCount === 1 ? "record" : "records"}</div>
      </div>
      <ButtonLink href={`/saas/projects/${projectId}/data/${modelId}/records`} variant="outline">
        Open Records
      </ButtonLink>
    </div>
  );
}
