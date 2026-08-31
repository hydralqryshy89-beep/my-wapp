import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import {
  listOrganizationMembersEligibleForProject,
  listProjectMembers,
} from "@/services/saas/member.service";
import { listAssignableProjectRoles } from "@/services/saas/role.service";
import { hasPermission, requireProjectContext } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/saas/errors";
import { changeProjectMemberRoleAction, removeProjectMemberAction } from "@/actions/saas/member.actions";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/saas/ui/table";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { AddProjectMemberForm } from "@/components/saas/members/add-project-member-form";
import { RoleSelect } from "@/components/saas/ui/role-select";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  if (!hasPermission(access.permissions, "project.member.view")) {
    return <AccessDenied message="You don't have permission to view project members." />;
  }

  const canAdd = hasPermission(access.permissions, "project.member.add");
  const canChangeRole = hasPermission(access.permissions, "project.member.role.update");
  const canRemove = hasPermission(access.permissions, "project.member.remove");

  const [members, roles, eligibleUsers] = await Promise.all([
    listProjectMembers(user.id, projectId),
    listAssignableProjectRoles(),
    canAdd ? listOrganizationMembersEligibleForProject(user.id, projectId) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title="Project Members" description="People with access to this project." />

      {canAdd && (
        <Card className="mb-6 p-5">
          <AddProjectMemberForm projectId={projectId} eligibleUsers={eligibleUsers} roles={roles} />
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
                        action={changeProjectMemberRoleAction.bind(null, projectId)}
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
                        action={removeProjectMemberAction.bind(null, projectId, member.id)}
                        confirmText={`Remove ${member.user.name} from this project?`}
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
