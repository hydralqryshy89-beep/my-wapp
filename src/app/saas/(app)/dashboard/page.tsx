import { Building2, FolderKanban, Plus } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { listOrganizationsForUser } from "@/services/saas/organization.service";
import { listProjectsForUser } from "@/services/saas/project.service";
import { PageHeader } from "@/components/saas/ui/page-header";
import { StatCard } from "@/components/saas/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";
import { ProjectStatusBadge } from "@/components/saas/projects/project-status-badge";
import { CreateOrganizationForm } from "@/components/saas/organizations/create-organization-form";

export default async function DashboardPage() {
  const user = await requireSaasUser();
  const [organizations, projects] = await Promise.all([
    listOrganizationsForUser(user.id),
    listProjectsForUser(user.id),
  ]);

  if (organizations.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Create your workspace</h1>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;re not part of an organization yet. Create one to start adding projects and team members.
          </p>
          <div className="mt-6 flex justify-center">
            <CreateOrganizationForm />
          </div>
        </div>
      </div>
    );
  }

  const recentProjects = projects.slice(0, 5);

  return (
    <div>
      <PageHeader title={`Welcome back, ${user.name}`} description="Here's what's happening across your workspaces." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Building2} label="Organizations" value={organizations.length} />
        <StatCard icon={FolderKanban} label="Projects" value={projects.length} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/saas/projects/new">
          <Plus size={16} />
          Create Project
        </ButtonLink>
        <ButtonLink href="/saas/projects" variant="outline">
          Open Projects
        </ButtonLink>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to get started."
              action={
                <ButtonLink href="/saas/projects/new" size="sm">
                  Create Project
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentProjects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <a href={`/saas/projects/${project.id}`} className="font-medium text-slate-900 hover:underline">
                      {project.icon ? `${project.icon} ` : ""}
                      {project.name}
                    </a>
                    <p className="text-xs text-slate-500">{project.organization.name}</p>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
