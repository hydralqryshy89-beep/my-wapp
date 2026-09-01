import { prisma } from "@/lib/prisma";
import { requirePageInProject, requireNodeInPage } from "@/services/saas/page-shared";
import { recordAuditLog } from "@/services/saas/audit.service";
import { NotFoundError, ValidationError } from "@/lib/saas/errors";
import { getComponentDefinition, isComponentType, canParentType, styleSchema } from "@/lib/saas/page-builder/component-registry";
import { isNodeOrAncestor, type PageNodeLike } from "@/lib/saas/page-builder/tree-validation";
import type { PermissionKey } from "@/lib/saas/constants";
import type { Prisma } from "@/generated/prisma/client";

export interface PageNodeRow {
  id: string;
  pageId: string;
  parentId: string | null;
  type: string;
  props: unknown;
  styles: unknown;
  settings: unknown;
  position: number;
}

/** The full tree as a flat, position-ordered list — the Editor and Renderer both build their own nested view from this same shape. */
export async function getPageTree(userId: string, projectId: string, pageId: string): Promise<{ nodes: PageNodeRow[] }> {
  await requirePageInProject(userId, projectId, pageId, "page.view" satisfies PermissionKey);
  const nodes = await prisma.saasPageNode.findMany({
    where: { pageId },
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
  });
  return { nodes };
}

function assertValidProps(type: string, props: unknown): Record<string, unknown> {
  if (!isComponentType(type)) throw new ValidationError(`Unknown component type "${type}".`);
  const definition = getComponentDefinition(type);
  const parsed = definition.propsSchema.safeParse(props);
  if (!parsed.success) {
    throw new ValidationError(`Invalid properties for "${definition.label}": ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
  }
  return parsed.data as Record<string, unknown>;
}

function assertValidStyles(styles: unknown): Record<string, unknown> {
  const parsed = styleSchema.safeParse(styles ?? {});
  if (!parsed.success) {
    throw new ValidationError(`Invalid styles: ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
  }
  return parsed.data as Record<string, unknown>;
}

export interface CreatePageNodeInput {
  parentId: string;
  type: string;
}

export async function createPageNode(userId: string, projectId: string, pageId: string, input: CreatePageNodeInput) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const parent = await requireNodeInPage(pageId, input.parentId);

  if (!isComponentType(input.type)) throw new ValidationError(`Unknown component type "${input.type}".`);
  if (input.type === "ROOT") throw new ValidationError("A page can only ever have one Root node.");
  if (!isComponentType(parent.type) || !canParentType(parent.type, input.type)) {
    throw new ValidationError("This component cannot be placed inside the selected parent.");
  }

  const definition = getComponentDefinition(input.type);

  return prisma.$transaction(async (tx) => {
    const position = await tx.saasPageNode.count({ where: { pageId, parentId: parent.id } });
    const node = await tx.saasPageNode.create({
      data: {
        pageId,
        parentId: parent.id,
        type: input.type,
        props: definition.defaultProps as Prisma.InputJsonValue,
        styles: definition.defaultStyles as Prisma.InputJsonValue,
        settings: {},
        position,
      },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_added",
        entity: "Page",
        entityId: pageId,
        metadata: { nodeId: node.id, type: node.type, parentId: parent.id },
      },
      tx
    );
    return node;
  });
}

export interface UpdatePageNodeInput {
  props?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export async function updatePageNode(
  userId: string,
  projectId: string,
  pageId: string,
  nodeId: string,
  input: UpdatePageNodeInput
) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const node = await requireNodeInPage(pageId, nodeId);

  const data: Prisma.SaasPageNodeUpdateInput = {};
  if (input.props !== undefined) data.props = assertValidProps(node.type, input.props) as Prisma.InputJsonValue;
  if (input.styles !== undefined) data.styles = assertValidStyles(input.styles) as Prisma.InputJsonValue;
  if (input.settings !== undefined) data.settings = input.settings as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasPageNode.update({ where: { id: nodeId }, data });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_updated",
        entity: "Page",
        entityId: pageId,
        metadata: { nodeId, type: node.type },
      },
      tx
    );
    return updated;
  });
}

/** The Root node can never be deleted — children cascade with the deleted node at the database level. */
export async function deletePageNode(userId: string, projectId: string, pageId: string, nodeId: string) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const node = await requireNodeInPage(pageId, nodeId);

  if (node.parentId === null) throw new ValidationError("The root component cannot be deleted.");

  return prisma.$transaction(async (tx) => {
    await tx.saasPageNode.delete({ where: { id: nodeId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_deleted",
        entity: "Page",
        entityId: pageId,
        metadata: { nodeId, type: node.type },
      },
      tx
    );
  });
}

/** Moves a node to a different parent within the same page — rejects moving the root, moving into itself/a descendant, or into a non-container/incompatible parent. */
export async function movePageNode(userId: string, projectId: string, pageId: string, nodeId: string, newParentId: string) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const node = await requireNodeInPage(pageId, nodeId);
  if (node.parentId === null) throw new ValidationError("The root component cannot be moved.");

  const newParent = await requireNodeInPage(pageId, newParentId);
  if (!isComponentType(node.type) || !isComponentType(newParent.type) || !canParentType(newParent.type, node.type)) {
    throw new ValidationError("This component cannot be placed inside the selected parent.");
  }

  const allNodes: PageNodeLike[] = await prisma.saasPageNode.findMany({
    where: { pageId },
    select: { id: true, parentId: true, type: true, position: true },
  });
  if (nodeId === newParentId || isNodeOrAncestor(allNodes, nodeId, newParentId)) {
    throw new ValidationError("Cannot move a component into itself or one of its own children.");
  }

  return prisma.$transaction(async (tx) => {
    const position = await tx.saasPageNode.count({ where: { pageId, parentId: newParentId } });
    const updated = await tx.saasPageNode.update({ where: { id: nodeId }, data: { parentId: newParentId, position } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_moved",
        entity: "Page",
        entityId: pageId,
        metadata: { nodeId, newParentId },
      },
      tx
    );
    return updated;
  });
}

/** Rewrites sibling positions under one parent in one shot — logged as a single event, not one per node. */
export async function reorderPageNodes(
  userId: string,
  projectId: string,
  pageId: string,
  parentId: string,
  orderedNodeIds: string[]
) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  await requireNodeInPage(pageId, parentId);

  const siblings = await prisma.saasPageNode.findMany({ where: { pageId, parentId } });
  if (siblings.length !== orderedNodeIds.length || !siblings.every((s) => orderedNodeIds.includes(s.id))) {
    throw new NotFoundError("One or more components not found under this parent.");
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedNodeIds.length; i++) {
      await tx.saasPageNode.update({ where: { id: orderedNodeIds[i] }, data: { position: i } });
    }
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.nodes_reordered",
        entity: "Page",
        entityId: pageId,
        metadata: { parentId, order: orderedNodeIds },
      },
      tx
    );
  });
}
