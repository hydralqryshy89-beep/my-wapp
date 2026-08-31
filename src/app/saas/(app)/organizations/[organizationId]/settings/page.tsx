import { notFound } from "next/navigation";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getOrganizationForMember } from "@/services/saas/organization.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { UpdateOrganizationForm } from "@/components/saas/organizations/update-organization-form";

export default async function OrganizationSettingsPage({
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

  if (!hasPermission(membership.permissions, "organization.view")) {
    return <AccessDenied message="You don't have permission to view organization settings." />;
  }

  const canEdit = hasPermission(membership.permissions, "organization.update");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Organization Settings" />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <UpdateOrganizationForm organizationId={organizationId} defaultName={organization.name} defaultLogo={organization.logo} />
          ) : (
            <div className="text-sm text-slate-700">
              <p>
                <span className="font-medium">Name:</span> {organization.name}
              </p>
              <p className="mt-1 text-slate-500">You don&apos;t have permission to edit this organization.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
