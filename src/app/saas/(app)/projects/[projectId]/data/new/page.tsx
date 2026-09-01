import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { requireProjectContext, hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { CreateDataModelForm } from "@/components/saas/data/create-data-model-form";

export default async function NewDataModelPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  if (!hasPermission(access.permissions, "data_model.create")) {
    return <AccessDenied message="You don't have permission to create data models in this project." />;
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New Data Model" />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateDataModelForm projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
