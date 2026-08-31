import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getProjectForMember } from "@/services/saas/project.service";
import { archiveProjectAction } from "@/actions/saas/project.actions";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { UpdateProjectForm } from "@/components/saas/projects/update-project-form";
import { ConfirmFormButton } from "@/components/saas/ui/confirm-form-button";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requireSaasUser();

  let project;
  let access;
  try {
    ({ project, access } = await getProjectForMember(user.id, projectId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  if (!hasPermission(access.permissions, "project.view")) {
    return <AccessDenied message="You don't have permission to view this project." />;
  }

  const canEdit = hasPermission(access.permissions, "project.update");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Project Settings" />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <UpdateProjectForm
              projectId={projectId}
              defaultName={project.name}
              defaultDescription={project.description}
              defaultIcon={project.icon}
            />
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to edit this project.</p>
          )}
        </CardContent>
      </Card>

      {canEdit && project.status === "ACTIVE" && (
        <Card className="mt-6 border-rose-200">
          <CardHeader className="border-rose-100">
            <CardTitle className="text-rose-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Archive this project</p>
              <p className="text-sm text-slate-500">Archived projects become read-only. This can&apos;t be undone here.</p>
            </div>
            <ConfirmFormButton
              action={archiveProjectAction.bind(null, projectId)}
              confirmText={`Archive "${project.name}"? It will become read-only.`}
              label="Archive Project"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
