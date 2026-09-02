import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getPage } from "@/services/saas/page.service";
import { getPageTree } from "@/services/saas/page-node.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { deletePageAction } from "@/actions/saas/page.actions";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { ConfirmFormButton } from "@/components/saas/ui/confirm-form-button";
import { PageEditor } from "@/components/saas/pages/page-editor";
import { UpdatePageForm } from "@/components/saas/pages/update-page-form";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; pageId: string }>;
}) {
  const { projectId, pageId } = await params;
  const user = await requireSaasUser();

  let page, access;
  try {
    ({ page, access } = await getPage(user.id, projectId, pageId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  const { nodes } = await getPageTree(user.id, projectId, pageId);
  const canEdit = hasPermission(access.permissions, "page.update");
  const canDelete = hasPermission(access.permissions, "page.delete");

  return (
    <div>
      <PageHeader title={page.name} description={`/${page.slug}`} />

      <PageEditor projectId={projectId} pageId={pageId} nodes={nodes} canEdit={canEdit} />

      {(canEdit || canDelete) && (
        <Card className="mt-6" id="page-settings">
          <CardHeader>
            <CardTitle>Page settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {canEdit && <UpdatePageForm projectId={projectId} pageId={pageId} defaultName={page.name} />}

            {canDelete && (
              <div className="rounded-lg border border-rose-200 p-4">
                <p className="text-sm font-medium text-slate-900">Delete this page</p>
                <p className="mt-1 text-sm text-slate-500">This will permanently remove the page and all of its components.</p>
                <div className="mt-3">
                  <ConfirmFormButton
                    action={deletePageAction.bind(null, projectId, pageId)}
                    confirmText={`Delete "${page.name}"? This will permanently remove the page and its components.`}
                    label="Delete Page"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
