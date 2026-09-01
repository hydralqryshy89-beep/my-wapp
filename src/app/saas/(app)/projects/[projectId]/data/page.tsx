import { notFound } from "next/navigation";
import { Database, Plus } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getDataModels } from "@/services/saas/data-model.service";
import { countDataRecordsByModelIds } from "@/services/saas/data-record.service";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { hasPermission, requireProjectContext } from "@/lib/saas/authorization";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";
import { AccessDenied } from "@/components/saas/ui/access-denied";

export default async function DataModelsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireSaasUser();

  let access;
  try {
    access = await requireProjectContext(user.id, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  if (!hasPermission(access.permissions, "data_model.view")) {
    return <AccessDenied message="You don't have permission to view this project's data models." />;
  }

  const models = await getDataModels(user.id, projectId);
  const canCreate = hasPermission(access.permissions, "data_model.create");
  const canViewRecords = hasPermission(access.permissions, "data_record.view");
  const recordCounts = canViewRecords ? await countDataRecordsByModelIds(models.map((m) => m.id)) : {};

  return (
    <div>
      <PageHeader
        title="Data Models"
        description="The building blocks of your project's data — no code required."
        action={
          canCreate && (
            <ButtonLink href={`/saas/projects/${projectId}/data/new`}>
              <Plus size={16} />
              New Data Model
            </ButtonLink>
          )
        }
      />

      {models.length === 0 ? (
        <Card>
          <EmptyState
            icon={Database}
            title="No data models yet"
            description="Start building your project's database — create your first data model."
            action={
              canCreate && (
                <ButtonLink href={`/saas/projects/${projectId}/data/new`} size="sm">
                  Create your first data model
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id} className="flex flex-col p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-lg">
                  {model.icon || "🗂️"}
                </div>
                <div className="min-w-0">
                  <a
                    href={`/saas/projects/${projectId}/data/${model.id}`}
                    className="block truncate font-semibold text-slate-900 hover:underline"
                  >
                    {model.name}
                  </a>
                  <p className="text-xs text-slate-500">
                    {model.fields.length} {model.fields.length === 1 ? "field" : "fields"}
                    {canViewRecords && <> · {(recordCounts[model.id] ?? 0).toLocaleString()} records</>}
                  </p>
                </div>
              </div>
              {model.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{model.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Updated {model.updatedAt.toLocaleDateString()}</span>
                <ButtonLink href={`/saas/projects/${projectId}/data/${model.id}`} size="sm" variant="ghost">
                  Open
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
