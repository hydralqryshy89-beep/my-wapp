import { Building2, Plus } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { listOrganizationsForUser } from "@/services/saas/organization.service";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";

export default async function OrganizationsPage() {
  const user = await requireSaasUser();
  const memberships = await listOrganizationsForUser(user.id);

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Workspaces you belong to."
        action={
          <ButtonLink href="/saas/organizations/new">
            <Plus size={16} />
            New Organization
          </ButtonLink>
        }
      />

      {memberships.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create a workspace to start inviting your team."
            action={
              <ButtonLink href="/saas/organizations/new" size="sm">
                New Organization
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ organization, role }) => (
            <Card key={organization.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <a href={`/saas/organizations/${organization.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
                    {organization.name}
                  </a>
                  <p className="text-xs text-slate-500">{role.name}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
