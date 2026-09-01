import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getDataModel, getDataModels } from "@/services/saas/data-model.service";
import { getRelations } from "@/services/saas/data-relation.service";
import { countDataRecordsForModel } from "@/services/saas/data-record.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { deleteDataModelAction } from "@/actions/saas/data-model.actions";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { ConfirmFormButton } from "@/components/saas/ui/confirm-form-button";
import { ModelEditorTabs } from "@/components/saas/data/model-editor-tabs";
import { FieldManager } from "@/components/saas/data/field-manager";
import { RelationManager } from "@/components/saas/data/relation-manager";
import { RecordsTabSummary } from "@/components/saas/data/records-tab-summary";
import { UpdateDataModelForm } from "@/components/saas/data/update-data-model-form";

export default async function DataModelEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; modelId: string }>;
}) {
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

  const [allModels, relations] = await Promise.all([
    getDataModels(user.id, projectId),
    getRelations(user.id, projectId),
  ]);

  const otherModels = allModels
    .filter((m) => m.id !== modelId)
    .map((m) => ({ id: m.id, name: m.name, fields: m.fields.map((f) => ({ id: f.id, name: f.name })) }));
  const currentModelForRelations = {
    id: model.id,
    name: model.name,
    fields: model.fields.map((f) => ({ id: f.id, name: f.name })),
  };
  const modelRelations = relations.filter((r) => r.fromModelId === modelId || r.toModelId === modelId);

  const canManageFields = hasPermission(access.permissions, "data_field.create");
  const canManageRelations = hasPermission(access.permissions, "data_relation.create");
  const canEditModel = hasPermission(access.permissions, "data_model.update");
  const canDeleteModel = hasPermission(access.permissions, "data_model.delete");
  const canViewRecords = hasPermission(access.permissions, "data_record.view");
  const canCreateRecords = hasPermission(access.permissions, "data_record.create");
  const recordCount = canViewRecords ? await countDataRecordsForModel(user.id, projectId, modelId) : 0;

  return (
    <div>
      <PageHeader title={`${model.icon ? model.icon + " " : ""}${model.name}`} description={model.description || undefined} />

      <Card>
        <CardContent className="pt-5">
          <ModelEditorTabs
            fieldsContent={
              <FieldManager projectId={projectId} modelId={modelId} fields={model.fields} canManage={canManageFields} />
            }
            relationsContent={
              <RelationManager
                projectId={projectId}
                modelId={modelId}
                currentModel={currentModelForRelations}
                otherModels={otherModels}
                relations={modelRelations}
                canManage={canManageRelations}
              />
            }
            recordsContent={
              <RecordsTabSummary
                projectId={projectId}
                modelId={modelId}
                modelName={model.name}
                recordCount={recordCount}
                canView={canViewRecords}
                canCreate={canCreateRecords}
              />
            }
            settingsContent={
              <div className="flex flex-col gap-6">
                {canEditModel ? (
                  <UpdateDataModelForm
                    projectId={projectId}
                    modelId={modelId}
                    defaultName={model.name}
                    defaultDescription={model.description}
                    defaultIcon={model.icon}
                  />
                ) : (
                  <p className="text-sm text-slate-500">You don&apos;t have permission to edit this data model.</p>
                )}

                {canDeleteModel && (
                  <div className="rounded-lg border border-rose-200 p-4">
                    <p className="text-sm font-medium text-slate-900">Delete this data model</p>
                    <p className="mt-1 text-sm text-slate-500">
                      This will permanently remove the model schema, its fields, and any relations connected to it.
                    </p>
                    <div className="mt-3">
                      <ConfirmFormButton
                        action={deleteDataModelAction.bind(null, projectId, modelId)}
                        confirmText={`Delete "${model.name}"? This will permanently remove the model schema.`}
                        label="Delete Data Model"
                      />
                    </div>
                  </div>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
