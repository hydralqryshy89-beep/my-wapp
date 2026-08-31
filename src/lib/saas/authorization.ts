import { prisma } from "@/lib/prisma";
import { getCurrentSaasUser } from "@/lib/saas/current-user";
import { ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS, type PermissionKey } from "@/lib/saas/constants";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/saas/errors";
import type { CurrentSaasUser, PermissionSet, TenantContext } from "@/types/saas";

async function loadRolePermissions(roleId: string): Promise<PermissionSet> {
  const rows = await prisma.saasRolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return new Set(rows.map((r) => r.permission.key as PermissionKey));
}

export function hasPermission(permissions: PermissionSet, key: PermissionKey): boolean {
  return permissions.has(key);
}

export function requirePermission(permissions: PermissionSet, key: PermissionKey): void {
  if (!hasPermission(permissions, key)) {
    throw new ForbiddenError(`You don't have the "${key}" permission.`);
  }
}

/** Use at the top of every Server Action. Throws (never redirects) so a failed mutation surfaces as an error. */
export async function requireAuth(): Promise<CurrentSaasUser> {
  const user = await getCurrentSaasUser();
  if (!user) throw new UnauthorizedError("You must be signed in.");
  return user;
}

export interface OrganizationMembership {
  organizationId: string;
  roleId: string;
  roleKey: string | null;
  permissions: PermissionSet;
}

/**
 * Verifies the user actually belongs to this organization and returns their
 * effective permission set. Never trust an organizationId coming from the
 * client without this check.
 */
export async function requireOrganizationMember(userId: string, organizationId: string): Promise<OrganizationMembership> {
  const organization = await prisma.saasOrganization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new NotFoundError("Organization not found.");

  const membership = await prisma.saasOrganizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { role: true },
  });
  if (!membership) throw new ForbiddenError("You are not a member of this organization.");

  const permissions = await loadRolePermissions(membership.roleId);
  return { organizationId, roleId: membership.roleId, roleKey: membership.role.key, permissions };
}

export interface ProjectAccess {
  tenantContext: TenantContext;
  organizationId: string;
  permissions: PermissionSet;
  isExplicitProjectMember: boolean;
}

/**
 * Verifies the user can act on this project at all, and returns their
 * effective permission set for it. Access requires either:
 *  - an explicit ProjectMember row (permissions come from that role), or
 *  - an org-wide role (Organization Owner/Admin), which manages every
 *    project in the organization without needing a membership row.
 * A plain Organization Member with no ProjectMember row gets neither.
 */
export async function requireProjectContext(userId: string, projectId: string): Promise<ProjectAccess> {
  const project = await prisma.saasProject.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found.");

  const orgMembership = await requireOrganizationMember(userId, project.organizationId);

  if (orgMembership.roleKey && ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS.includes(orgMembership.roleKey)) {
    return {
      tenantContext: { userId, organizationId: project.organizationId, projectId },
      organizationId: project.organizationId,
      permissions: orgMembership.permissions,
      isExplicitProjectMember: false,
    };
  }

  const projectMembership = await prisma.saasProjectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!projectMembership) throw new ForbiddenError("You are not a member of this project.");

  const permissions = await loadRolePermissions(projectMembership.roleId);
  return {
    tenantContext: { userId, organizationId: project.organizationId, projectId },
    organizationId: project.organizationId,
    permissions,
    isExplicitProjectMember: true,
  };
}
