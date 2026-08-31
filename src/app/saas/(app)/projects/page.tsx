import { FolderKanban, Plus, Settings } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { listProjectsForUser } from "@/services/saas/project.service";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";
import { ProjectStatusBadge } from "@/components/saas/projects/project-status-badge";

export default async function ProjectsPage() {
  const user = await requireSaasUser();
  const projects = await listProjectsForUser(user.id);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Every project you have access to."
        action={
          <ButtonLink href="/saas/projects/new">
            <Plus size={16} />
            New Project
          </ButtonLink>
        }
      />

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to get started."
            action={
              <ButtonLink href="/saas/projects/new" size="sm">
                New Project
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a href={`/saas/projects/${project.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
                    {project.icon ? `${project.icon} ` : ""}
                    {project.name}
                  </a>
                  <p className="text-xs text-slate-500">{project.organization.name}</p>
                </div>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{project.description}</p>}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Updated {project.updatedAt.toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <ButtonLink href={`/saas/projects/${project.id}`} size="sm" variant="ghost">
                    Open
                  </ButtonLink>
                  <ButtonLink href={`/saas/projects/${project.id}/settings`} size="sm" variant="ghost">
                    <Settings size={14} />
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
