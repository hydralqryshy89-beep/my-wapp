import { notFound } from "next/navigation";
import { Users, Settings, Calendar } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getProjectForMember } from "@/services/saas/project.service";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { ButtonLink } from "@/components/saas/ui/button";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { ProjectStatusBadge } from "@/components/saas/projects/project-status-badge";
import { hasPermission } from "@/lib/saas/authorization";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  const canViewMembers = hasPermission(access.permissions, "project.member.view");

  return (
    <div>
      <PageHeader
        title={`${project.icon ? project.icon + " " : ""}${project.name}`}
        description={project.organization.name}
        action={
          <div className="flex gap-2">
            {canViewMembers && (
              <ButtonLink href={`/saas/projects/${projectId}/members`} variant="outline" size="sm">
                <Users size={16} />
                Members
              </ButtonLink>
            )}
            <ButtonLink href={`/saas/projects/${projectId}/settings`} variant="outline" size="sm">
              <Settings size={16} />
              Settings
            </ButtonLink>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{project.createdAt.toLocaleDateString()}</div>
            <div className="text-sm text-slate-500">Created</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{project.updatedAt.toLocaleDateString()}</div>
            <div className="text-sm text-slate-500">Updated</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <ProjectStatusBadge status={project.status} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {project.description || <span className="text-slate-400">No description yet.</span>}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <a
            href={`/saas/projects/${projectId}/data`}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-4 text-center font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Data
          </a>
          {["Pages", "Forms", "Workflows"].map((label) => (
            <div key={label} className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-slate-500">
              {label}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
