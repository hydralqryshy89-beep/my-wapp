import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/saas/slug";
import { requireProjectContext, requirePermission } from "@/lib/saas/authorization";
import { requirePageInProject } from "@/services/saas/page-shared";
import { recordAuditLog } from "@/services/saas/audit.service";
import type { PermissionKey } from "@/lib/saas/constants";

async function generateUniquePageSlug(projectId: string, name: string): Promise<string> {
  const base = slugify(name) || "page";
  let candidate = base;
  let n = 2;
  while (await prisma.saasPage.findUnique({ where: { projectId_slug: { projectId, slug: candidate } } })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

export interface CreatePageInput {
  name: string;
}

/** Creates the page and its Root node atomically — a page with no Root can never exist. */
export async function createPage(userId: string, projectId: string, input: CreatePageInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "page.create" satisfies PermissionKey);

  const slug = await generateUniquePageSlug(projectId, input.name);

  return prisma.$transaction(async (tx) => {
    const page = await tx.saasPage.create({
      data: { projectId, name: input.name, slug, createdById: userId },
    });
    await tx.saasPageNode.create({
      data: { pageId: page.id, parentId: null, type: "ROOT", props: {}, styles: {}, settings: {}, position: 0 },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.created",
        entity: "Page",
        entityId: page.id,
        metadata: { name: page.name, slug: page.slug },
      },
      tx
    );
    return page;
  });
}

export async function getPages(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "page.view" satisfies PermissionKey);

  return prisma.saasPage.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" } });
}

export async function getPage(userId: string, projectId: string, pageId: string) {
  const { access, page } = await requirePageInProject(userId, projectId, pageId, "page.view" satisfies PermissionKey);
  return { page, access };
}

export interface UpdatePageInput {
  name: string;
}

export async function updatePage(userId: string, projectId: string, pageId: string, input: UpdatePageInput) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasPage.update({
      where: { id: pageId },
      data: { name: input.name, updatedById: userId },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.updated",
        entity: "Page",
        entityId: pageId,
        metadata: { name: updated.name },
      },
      tx
    );
    return updated;
  });
}

/** Deletes the page; its nodes cascade with it at the database level (see schema's onDelete: Cascade). */
export async function deletePage(userId: string, projectId: string, pageId: string) {
  const { access, page } = await requirePageInProject(userId, projectId, pageId, "page.delete" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    await tx.saasPage.delete({ where: { id: pageId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.deleted",
        entity: "Page",
        entityId: pageId,
        metadata: { name: page.name, slug: page.slug },
      },
      tx
    );
  });
}
