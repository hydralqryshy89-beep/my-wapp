import { notFound } from "next/navigation";
import { Users, FolderKanban, Settings } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getOrganizationForMember } from "@/services/saas/organization.service";
import { listProjectsForUser } from "@/services/saas/project.service";
import { NotFoundError, ForbiddenError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { StatCard } from "@/components/saas/ui/stat-card";
import { ButtonLink } from "@/components/saas/ui/button";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { ProjectStatusBadge } from "@/components/saas/projects/project-status-badge";

export default async function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const user = await requireSaasUser();

  let organization;
  let membership;
  try {
    ({ organization, membership } = await getOrganizationForMember(user.id, organizationId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  const allProjects = await listProjectsForUser(user.id);
  const orgProjects = allProjects.filter((p) => p.organizationId === organizationId);

  return (
    <div>
      <PageHeader
        title={organization.name}
        description={`Your role: ${membership.roleKey ?? "member"}`}
        action={
          <div className="flex gap-2">
            <ButtonLink href={`/saas/organizations/${organizationId}/members`} variant="outline" size="sm">
              <Users size={16} />
              Members
            </ButtonLink>
            <ButtonLink href={`/saas/organizations/${organizationId}/settings`} variant="outline" size="sm">
              <Settings size={16} />
              Settings
            </ButtonLink>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={FolderKanban} label="Projects" value={orgProjects.length} />
        <StatCard icon={Users} label="Created" value={organization.createdAt.toLocaleDateString()} />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Projects in this organization</h3>
          <ButtonLink href="/saas/projects/new" size="sm" variant="outline">
            New Project
          </ButtonLink>
        </div>
        {orgProjects.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orgProjects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <a href={`/saas/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
                  {project.icon ? `${project.icon} ` : ""}
                  {project.name}
                </a>
                <ProjectStatusBadge status={project.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
