import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getDataModel } from "@/services/saas/data-model.service";
import { getDataRecord } from "@/services/saas/data-record.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { deleteDataRecordAction } from "@/actions/saas/data-record.actions";
import { Breadcrumbs } from "@/components/saas/ui/breadcrumbs";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { ButtonLink } from "@/components/saas/ui/button";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";
import { FieldValueDisplay } from "@/components/saas/data/field-value-display";

function relationValueLabel(target: { id: string; data: Record<string, unknown> }): string {
  const first = Object.values(target.data).find((v) => typeof v === "string" && v.trim());
  return typeof first === "string" ? first : target.id;
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; modelId: string; recordId: string }>;
}) {
  const { projectId, modelId, recordId } = await params;
  const user = await requireSaasUser();

  let model;
  try {
    ({ model } = await getDataModel(user.id, projectId, modelId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  let record, relations, access;
  try {
    ({ record, relations, access } = await getDataRecord(user.id, projectId, modelId, recordId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  const canUpdate = hasPermission(access.permissions, "data_record.update");
  const canDelete = hasPermission(access.permissions, "data_record.delete");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Data", href: `/saas/projects/${projectId}/data` },
          { label: model.name, href: `/saas/projects/${projectId}/data/${modelId}` },
          { label: "Records", href: `/saas/projects/${projectId}/data/${modelId}/records` },
          { label: "Record" },
        ]}
      />
      <PageHeader
        title={model.name}
        action={
          <div className="flex gap-2">
            {canUpdate && (
              <ButtonLink href={`/saas/projects/${projectId}/data/${modelId}/records/${recordId}/edit`} variant="outline" size="sm">
                <Pencil size={16} />
                Edit
              </ButtonLink>
            )}
            {canDelete && (
              <ConfirmSubmitButton
                action={deleteDataRecordAction.bind(null, projectId, modelId, recordId)}
                confirmText="Delete this record? This can't be undone."
                label="Delete"
                pendingLabel="Deleting..."
              />
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {model.fields.map((field) => (
            <div key={field.id}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field.name}</div>
              <div className="mt-1 text-sm text-slate-900">
                <FieldValueDisplay field={field} value={record.data[field.key]} />
              </div>
            </div>
          ))}
          {model.fields.length === 0 && <p className="text-sm text-slate-500">This data model has no fields yet.</p>}
        </CardContent>
      </Card>

      {relations.length > 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4">
            {relations.map((relation) => (
              <div key={relation.relationId}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{relation.name}</div>
                <div className="mt-1 text-sm">
                  {relation.value === null ? (
                    <span className="text-slate-300">—</span>
                  ) : Array.isArray(relation.value) ? (
                    relation.value.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {relation.value.map((v) => (
                          <li key={v.id}>
                            <Link href={`/saas/projects/${projectId}/data/${relation.toModelId}/records/${v.id}`} className="text-indigo-600 hover:underline">
                              {relationValueLabel(v)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <Link href={`/saas/projects/${projectId}/data/${relation.toModelId}/records/${relation.value.id}`} className="text-indigo-600 hover:underline">
                      {relationValueLabel(relation.value)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
