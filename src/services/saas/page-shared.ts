import { prisma } from "@/lib/prisma";
import { requireProjectContext, requirePermission } from "@/lib/saas/authorization";
import { NotFoundError } from "@/lib/saas/errors";
import type { PermissionKey } from "@/lib/saas/constants";

/** Shared by page/page-node services: resolves + authorizes project access, then verifies the page actually belongs to that project. Never trust a pageId alone. */
export async function requirePageInProject(userId: string, projectId: string, pageId: string, permission: PermissionKey) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, permission);

  const page = await prisma.saasPage.findUnique({ where: { id: pageId } });
  if (!page || page.projectId !== projectId) throw new NotFoundError("Page not found.");

  return { access, page };
}

/** Verifies a node actually belongs to the given page. Never trust a nodeId alone. */
export async function requireNodeInPage(pageId: string, nodeId: string) {
  const node = await prisma.saasPageNode.findUnique({ where: { id: nodeId } });
  if (!node || node.pageId !== pageId) throw new NotFoundError("Component not found.");
  return node;
}
