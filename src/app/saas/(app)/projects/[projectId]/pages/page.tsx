import { notFound } from "next/navigation";
import { Layout, Plus } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getPages } from "@/services/saas/page.service";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { hasPermission, requireProjectContext } from "@/lib/saas/authorization";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";
import { AccessDenied } from "@/components/saas/ui/access-denied";

export default async function PagesListPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  if (!hasPermission(access.permissions, "page.view")) {
    return <AccessDenied message="You don't have permission to view this project's pages." />;
  }

  const pages = await getPages(user.id, projectId);
  const canCreate = hasPermission(access.permissions, "page.create");

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Design screens for your project — no code required."
        action={
          canCreate && (
            <ButtonLink href={`/saas/projects/${projectId}/pages/new`}>
              <Plus size={16} />
              New Page
            </ButtonLink>
          )
        }
      />

      {pages.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layout}
            title="No pages yet"
            description="Start designing your project — create your first page."
            action={
              canCreate && (
                <ButtonLink href={`/saas/projects/${projectId}/pages/new`} size="sm">
                  Create your first page
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="flex flex-col p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Layout size={18} />
                </div>
                <div className="min-w-0">
                  <a
                    href={`/saas/projects/${projectId}/pages/${page.id}`}
                    className="block truncate font-semibold text-slate-900 hover:underline"
                  >
                    {page.name}
                  </a>
                  <p className="text-xs text-slate-500">/{page.slug} · {page.status}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Updated {page.updatedAt.toLocaleDateString()}</span>
                <ButtonLink href={`/saas/projects/${projectId}/pages/${page.id}`} size="sm" variant="ghost">
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
