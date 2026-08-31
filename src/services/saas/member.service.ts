import { prisma } from "@/lib/prisma";
import { requireOrganizationMember, requirePermission, requireProjectContext } from "@/lib/saas/authorization";
import { ensureNotLastOwner, requireOrganizationRole, requireProjectRole } from "@/services/saas/role.service";
import { ROLE_KEYS, type PermissionKey } from "@/lib/saas/constants";
import { ConflictError, NotFoundError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";

// ---------------------------------------------------------------------------
// Organization members
// ---------------------------------------------------------------------------

export async function listOrganizationMembers(userId: string, organizationId: string) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "member.view" satisfies PermissionKey);

  return prisma.saasOrganizationMember.findMany({
    where: { organizationId },
    include: { user: true, role: true },
    orderBy: { createdAt: "asc" },
  });
}

export interface AddOrganizationMemberInput {
  email: string;
  roleId: string;
}

export async function addOrganizationMember(userId: string, organizationId: string, input: AddOrganizationMemberInput) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "member.invite" satisfies PermissionKey);
  const role = await requireOrganizationRole(input.roleId);

  const targetUser = await prisma.saasUser.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!targetUser) {
    throw new NotFoundError("No user with that email exists yet. They need to register first.");
  }

  const existing = await prisma.saasOrganizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: targetUser.id } },
  });
  if (existing) throw new ConflictError("This user is already a member of the organization.");

  return prisma.$transaction(async (tx) => {
    const created = await tx.saasOrganizationMember.create({
      data: { organizationId, userId: targetUser.id, roleId: role.id },
      include: { user: true, role: true },
    });
    await recordAuditLog(
      {
        organizationId,
        userId,
        action: "member.added",
        entity: "OrganizationMember",
        entityId: created.id,
        metadata: { targetUserId: targetUser.id, role: role.name },
      },
      tx
    );
    return created;
  });
}

export async function removeOrganizationMember(userId: string, organizationId: string, memberId: string) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "member.remove" satisfies PermissionKey);

  const target = await prisma.saasOrganizationMember.findUnique({ where: { id: memberId }, include: { role: true } });
  if (!target || target.organizationId !== organizationId) throw new NotFoundError("Member not found.");
  if (target.role.key === ROLE_KEYS.ORG_OWNER) {
    await ensureNotLastOwner(organizationId, memberId);
  }

  return prisma.$transaction(async (tx) => {
    await tx.saasOrganizationMember.delete({ where: { id: memberId } });
    await recordAuditLog(
      {
        organizationId,
        userId,
        action: "member.removed",
        entity: "OrganizationMember",
        entityId: memberId,
        metadata: { targetUserId: target.userId },
      },
      tx
    );
  });
}

export async function changeOrganizationMemberRole(
  userId: string,
  organizationId: string,
  memberId: string,
  newRoleId: string
) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "member.role.update" satisfies PermissionKey);
  const newRole = await requireOrganizationRole(newRoleId);

  const target = await prisma.saasOrganizationMember.findUnique({ where: { id: memberId }, include: { role: true } });
  if (!target || target.organizationId !== organizationId) throw new NotFoundError("Member not found.");
  if (target.role.key === ROLE_KEYS.ORG_OWNER && newRole.key !== ROLE_KEYS.ORG_OWNER) {
    await ensureNotLastOwner(organizationId, memberId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasOrganizationMember.update({
      where: { id: memberId },
      data: { roleId: newRole.id },
      include: { user: true, role: true },
    });
    await recordAuditLog(
      {
        organizationId,
        userId,
        action: "role.changed",
        entity: "OrganizationMember",
        entityId: memberId,
        metadata: { targetUserId: target.userId, from: target.role.name, to: newRole.name },
      },
      tx
    );
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Project members
// ---------------------------------------------------------------------------

export async function listProjectMembers(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.member.view" satisfies PermissionKey);

  return prisma.saasProjectMember.findMany({
    where: { projectId },
    include: { user: true, role: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Organization members not yet on this project — the eligible pool for "Add Member". */
export async function listOrganizationMembersEligibleForProject(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.member.add" satisfies PermissionKey);

  const [orgMembers, projectMembers] = await Promise.all([
    prisma.saasOrganizationMember.findMany({
      where: { organizationId: access.organizationId },
      include: { user: true },
    }),
    prisma.saasProjectMember.findMany({ where: { projectId }, select: { userId: true } }),
  ]);
  const existingUserIds = new Set(projectMembers.map((m) => m.userId));
  return orgMembers.filter((m) => !existingUserIds.has(m.userId)).map((m) => m.user);
}

export interface AddProjectMemberInput {
  userId: string;
  roleId: string;
}

export async function addProjectMember(userId: string, projectId: string, input: AddProjectMemberInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.member.add" satisfies PermissionKey);
  const role = await requireProjectRole(input.roleId);

  const isOrgMember = await prisma.saasOrganizationMember.findUnique({
    where: { organizationId_userId: { organizationId: access.organizationId, userId: input.userId } },
  });
  if (!isOrgMember) {
    throw new ConflictError("Only members of this organization can be added to a project.");
  }

  const existing = await prisma.saasProjectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.userId } },
  });
  if (existing) throw new ConflictError("This user is already a member of the project.");

  return prisma.$transaction(async (tx) => {
    const created = await tx.saasProjectMember.create({
      data: { projectId, userId: input.userId, roleId: role.id },
      include: { user: true, role: true },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "member.added",
        entity: "ProjectMember",
        entityId: created.id,
        metadata: { targetUserId: input.userId, role: role.name },
      },
      tx
    );
    return created;
  });
}

export async function removeProjectMember(userId: string, projectId: string, memberId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.member.remove" satisfies PermissionKey);

  const target = await prisma.saasProjectMember.findUnique({ where: { id: memberId } });
  if (!target || target.projectId !== projectId) throw new NotFoundError("Member not found.");

  return prisma.$transaction(async (tx) => {
    await tx.saasProjectMember.delete({ where: { id: memberId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "member.removed",
        entity: "ProjectMember",
        entityId: memberId,
        metadata: { targetUserId: target.userId },
      },
      tx
    );
  });
}

export async function changeProjectMemberRole(userId: string, projectId: string, memberId: string, newRoleId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.member.role.update" satisfies PermissionKey);
  const newRole = await requireProjectRole(newRoleId);

  const target = await prisma.saasProjectMember.findUnique({ where: { id: memberId }, include: { role: true } });
  if (!target || target.projectId !== projectId) throw new NotFoundError("Member not found.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasProjectMember.update({
      where: { id: memberId },
      data: { roleId: newRole.id },
      include: { user: true, role: true },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "role.changed",
        entity: "ProjectMember",
        entityId: memberId,
        metadata: { targetUserId: target.userId, from: target.role.name, to: newRole.name },
      },
      tx
    );
    return updated;
  });
}
