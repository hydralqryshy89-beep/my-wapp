import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getDataModel, getDataModels } from "@/services/saas/data-model.service";
import { getRelationAnchorInfoForForm } from "@/services/saas/data-record.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { Breadcrumbs } from "@/components/saas/ui/breadcrumbs";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { RecordForm } from "@/components/saas/data/record-form";

export default async function NewRecordPage({ params }: { params: Promise<{ projectId: string; modelId: string }> }) {
  const { projectId, modelId } = await params;
  const user = await requireSaasUser();

  let model, access;
  try {
    ({ model, access } = await getDataModel(user.id, projectId, modelId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  if (!hasPermission(access.permissions, "data_record.create")) {
    return <AccessDenied message="You don't have permission to add records to this data model." />;
  }

  const allModels = await getDataModels(user.id, projectId);
  const relationAnchors = await getRelationAnchorInfoForForm(projectId, modelId, allModels);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Data", href: `/saas/projects/${projectId}/data` },
          { label: model.name, href: `/saas/projects/${projectId}/data/${modelId}` },
          { label: "Records", href: `/saas/projects/${projectId}/data/${modelId}/records` },
          { label: "New" },
        ]}
      />
      <PageHeader title={`Add ${model.name}`} />
      <Card>
        <CardContent>
          <RecordForm projectId={projectId} modelId={modelId} fields={model.fields} relationAnchors={relationAnchors} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
