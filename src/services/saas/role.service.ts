import { prisma } from "@/lib/prisma";
import { ROLE_KEYS } from "@/lib/saas/constants";
import { ConflictError, NotFoundError } from "@/lib/saas/errors";

const ORGANIZATION_ROLE_KEYS: readonly string[] = [ROLE_KEYS.ORG_OWNER, ROLE_KEYS.ORG_ADMIN, ROLE_KEYS.ORG_MEMBER];
const PROJECT_ROLE_KEYS: readonly string[] = [ROLE_KEYS.PROJECT_ADMIN, ROLE_KEYS.PROJECT_MEMBER, ROLE_KEYS.PROJECT_VIEWER];

/** The system roles an org owner/admin can assign to an organization member. */
export function listAssignableOrganizationRoles() {
  return prisma.saasRole.findMany({ where: { key: { in: [...ORGANIZATION_ROLE_KEYS] } }, orderBy: { name: "asc" } });
}

/** The system roles a project admin can assign to a project member. */
export function listAssignableProjectRoles() {
  return prisma.saasRole.findMany({ where: { key: { in: [...PROJECT_ROLE_KEYS] } }, orderBy: { name: "asc" } });
}

export async function getRoleById(roleId: string) {
  const role = await prisma.saasRole.findUnique({ where: { id: roleId } });
  if (!role) throw new NotFoundError("Role not found.");
  return role;
}

export async function requireOrganizationRole(roleId: string) {
  const role = await getRoleById(roleId);
  if (!role.key || !ORGANIZATION_ROLE_KEYS.includes(role.key)) {
    throw new NotFoundError("That is not a valid organization role.");
  }
  return role;
}

export async function requireProjectRole(roleId: string) {
  const role = await getRoleById(roleId);
  if (!role.key || !PROJECT_ROLE_KEYS.includes(role.key)) {
    throw new NotFoundError("That is not a valid project role.");
  }
  return role;
}

/** Prevents an organization from ending up with zero Owners (would lock everyone out of ownership-level actions). */
export async function ensureNotLastOwner(organizationId: string, excludeMemberId?: string) {
  const ownerRole = await prisma.saasRole.findUnique({ where: { key: ROLE_KEYS.ORG_OWNER } });
  if (!ownerRole) return;
  const otherOwners = await prisma.saasOrganizationMember.count({
    where: { organizationId, roleId: ownerRole.id, id: excludeMemberId ? { not: excludeMemberId } : undefined },
  });
  if (otherOwners === 0) {
    throw new ConflictError(
      "This organization must keep at least one Owner. Promote another member to Owner first."
    );
  }
}
