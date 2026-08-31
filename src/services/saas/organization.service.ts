import { prisma } from "@/lib/prisma";
import { slugify, withRandomSuffix } from "@/lib/saas/slug";
import { ROLE_KEYS, type PermissionKey } from "@/lib/saas/constants";
import { requireOrganizationMember, requirePermission } from "@/lib/saas/authorization";
import { NotFoundError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";

async function generateUniqueOrganizationSlug(name: string): Promise<string> {
  const base = slugify(name) || "organization";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.saasOrganization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = withRandomSuffix(base);
  }
  return withRandomSuffix(base);
}

export interface CreateOrganizationInput {
  name: string;
  logo?: string | null;
}

/** Creates the organization and makes the creator its Owner, atomically. */
export async function createOrganization(actorUserId: string, input: CreateOrganizationInput) {
  const slug = await generateUniqueOrganizationSlug(input.name);

  const ownerRole = await prisma.saasRole.findUnique({ where: { key: ROLE_KEYS.ORG_OWNER } });
  if (!ownerRole) throw new NotFoundError("System roles are not seeded. Run the database seed first.");

  return prisma.$transaction(async (tx) => {
    const organization = await tx.saasOrganization.create({
      data: { name: input.name, slug, logo: input.logo ?? null },
    });

    await tx.saasOrganizationMember.create({
      data: { organizationId: organization.id, userId: actorUserId, roleId: ownerRole.id },
    });

    await recordAuditLog(
      {
        organizationId: organization.id,
        userId: actorUserId,
        action: "organization.created",
        entity: "Organization",
        entityId: organization.id,
        metadata: { name: organization.name },
      },
      tx
    );

    return organization;
  });
}

export async function listOrganizationsForUser(userId: string) {
  const memberships = await prisma.saasOrganizationMember.findMany({
    where: { userId },
    include: { organization: true, role: true },
    orderBy: { organization: { name: "asc" } },
  });
  return memberships.map((m) => ({ organization: m.organization, role: m.role }));
}

export async function getOrganizationForMember(userId: string, organizationId: string) {
  const membership = await requireOrganizationMember(userId, organizationId);
  const organization = await prisma.saasOrganization.findUniqueOrThrow({ where: { id: organizationId } });
  return { organization, membership };
}

export interface UpdateOrganizationInput {
  name: string;
  logo?: string | null;
}

export async function updateOrganization(userId: string, organizationId: string, input: UpdateOrganizationInput) {
  const membership = await requireOrganizationMember(userId, organizationId);
  requirePermission(membership.permissions, "organization.update" satisfies PermissionKey);

  const organization = await prisma.$transaction(async (tx) => {
    const updated = await tx.saasOrganization.update({
      where: { id: organizationId },
      data: { name: input.name, logo: input.logo ?? null },
    });
    await recordAuditLog(
      {
        organizationId,
        userId,
        action: "organization.updated",
        entity: "Organization",
        entityId: organizationId,
        metadata: { name: updated.name },
      },
      tx
    );
    return updated;
  });

  return organization;
}
