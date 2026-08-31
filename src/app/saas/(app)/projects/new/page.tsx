import { requireSaasUser } from "@/lib/saas/current-user";
import { listOrganizationsForUser } from "@/services/saas/organization.service";
import { ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS } from "@/lib/saas/constants";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/saas/ui/card";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { CreateProjectForm } from "@/components/saas/projects/create-project-form";

export default async function NewProjectPage() {
  const user = await requireSaasUser();
  const memberships = await listOrganizationsForUser(user.id);
  const eligibleOrganizations = memberships
    .filter((m) => m.role.key && ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS.includes(m.role.key))
    .map((m) => m.organization);

  if (eligibleOrganizations.length === 0) {
    return (
      <AccessDenied message="You need to be an Owner or Admin of an organization to create a project." />
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New Project" />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProjectForm organizations={eligibleOrganizations} />
        </CardContent>
      </Card>
    </div>
  );
}
