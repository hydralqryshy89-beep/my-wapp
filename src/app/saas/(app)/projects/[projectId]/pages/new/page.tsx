import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { requireProjectContext, hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { CreatePageForm } from "@/components/saas/pages/create-page-form";

export default async function NewPagePage({ params }: { params: Promise<{ projectId: string }> }) {
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

  if (!hasPermission(access.permissions, "page.create")) {
    return <AccessDenied message="You don't have permission to create pages in this project." />;
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New Page" />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePageForm projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
