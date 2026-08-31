import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { listOrganizationMembers } from "@/services/saas/member.service";
import { listAssignableOrganizationRoles } from "@/services/saas/role.service";
import { hasPermission, requireOrganizationMember } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { changeOrganizationMemberRoleAction, removeOrganizationMemberAction } from "@/actions/saas/member.actions";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/saas/ui/table";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { AddOrganizationMemberForm } from "@/components/saas/members/add-organization-member-form";
import { RoleSelect } from "@/components/saas/ui/role-select";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";

export default async function OrganizationMembersPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const user = await requireSaasUser();

  let ownPermissions;
  try {
    ownPermissions = (await requireOrganizationMember(user.id, organizationId)).permissions;
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  if (!hasPermission(ownPermissions, "member.view")) {
    return <AccessDenied message="You don't have permission to view members." />;
  }

  const [members, roles] = await Promise.all([
    listOrganizationMembers(user.id, organizationId),
    listAssignableOrganizationRoles(),
  ]);

  const canInvite = hasPermission(ownPermissions, "member.invite");
  const canChangeRole = hasPermission(ownPermissions, "member.role.update");
  const canRemove = hasPermission(ownPermissions, "member.remove");

  return (
    <div>
      <PageHeader title="Organization Members" description="People with access to this organization." />

      {canInvite && (
        <Card className="mb-6 p-5">
          <AddOrganizationMemberForm organizationId={organizationId} roles={roles} />
        </Card>
      )}

      <Card>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members" description="Add a member to get started." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                {canRemove && <Th />}
              </Tr>
            </Thead>
            <Tbody>
              {members.map((member) => (
                <Tr key={member.id}>
                  <Td className="font-medium text-slate-900">{member.user.name}</Td>
                  <Td>{member.user.email}</Td>
                  <Td>
                    {canChangeRole ? (
                      <RoleSelect
                        action={changeOrganizationMemberRoleAction.bind(null, organizationId)}
                        memberId={member.id}
                        currentRoleId={member.roleId}
                        roles={roles}
                      />
                    ) : (
                      member.role.name
                    )}
                  </Td>
                  <Td>{member.createdAt.toLocaleDateString()}</Td>
                  {canRemove && (
                    <Td className="text-right">
                      <ConfirmSubmitButton
                        action={removeOrganizationMemberAction.bind(null, organizationId, member.id)}
                        confirmText={`Remove ${member.user.name} from this organization?`}
                        label="Remove"
                        pendingLabel="Removing..."
                      />
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
