import { prisma } from "@/lib/prisma";
import { slugify, withRandomSuffix } from "@/lib/saas/slug";
import { ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS, ROLE_KEYS, type PermissionKey } from "@/lib/saas/constants";
import { requireOrganizationMember, requirePermission, requireProjectContext } from "@/lib/saas/authorization";
import { NotFoundError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";

async function generateUniqueProjectSlug(organizationId: string, name: string): Promise<string> {
  const base = slugify(name) || "project";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.saasProject.findUnique({
      where: { organizationId_slug: { organizationId, slug: candidate } },
    });
    if (!existing) return candidate;
    candidate = withRandomSuffix(base);
  }
  return withRandomSuffix(base);
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

/** Creates the project and makes the creator its Project Admin, atomically. */
export async function createProject(userId: string, organizationId: string, input: CreateProjectInput) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "project.create" satisfies PermissionKey);

  const slug = await generateUniqueProjectSlug(organizationId, input.name);
  const projectAdminRole = await prisma.saasRole.findUnique({ where: { key: ROLE_KEYS.PROJECT_ADMIN } });
  if (!projectAdminRole) throw new NotFoundError("System roles are not seeded. Run the database seed first.");

  return prisma.$transaction(async (tx) => {
    const project = await tx.saasProject.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
      },
    });

    await tx.saasProjectMember.create({
      data: { projectId: project.id, userId, roleId: projectAdminRole.id },
    });

    await recordAuditLog(
      {
        organizationId,
        projectId: project.id,
        userId,
        action: "project.created",
        entity: "Project",
        entityId: project.id,
        metadata: { name: project.name },
      },
      tx
    );

    return project;
  });
}

/** Every project the user can see: explicit project memberships, plus every project in orgs where they hold an org-wide role. */
export async function listProjectsForUser(userId: string) {
  const orgMemberships = await prisma.saasOrganizationMember.findMany({
    where: { userId },
    include: { role: true },
  });
  const orgWideOrgIds = orgMemberships
    .filter((m) => m.role.key && ORG_WIDE_PROJECT_ACCESS_ROLE_KEYS.includes(m.role.key))
    .map((m) => m.organizationId);

  const projectMemberships = await prisma.saasProjectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const explicitProjectIds = projectMemberships.map((m) => m.projectId);

  const projects = await prisma.saasProject.findMany({
    where: {
      OR: [
        { organizationId: { in: orgWideOrgIds } },
        { id: { in: explicitProjectIds } },
      ],
    },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return projects;
}

export async function getProjectForMember(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  const project = await prisma.saasProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  return { project, access };
}

export interface UpdateProjectInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

export async function updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.update" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasProject.update({
      where: { id: projectId },
      data: { name: input.name, description: input.description ?? null, icon: input.icon ?? null },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "project.updated",
        entity: "Project",
        entityId: projectId,
        metadata: { name: updated.name },
      },
      tx
    );
    return updated;
  });
}

export async function archiveProject(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "project.update" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasProject.update({
      where: { id: projectId },
      data: { status: "ARCHIVED" },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "project.archived",
        entity: "Project",
        entityId: projectId,
      },
      tx
    );
    return updated;
  });
}
