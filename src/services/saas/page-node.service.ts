import { prisma } from "@/lib/prisma";
import { requirePageInProject, requireNodeInPage } from "@/services/saas/page-shared";
import { recordAuditLog } from "@/services/saas/audit.service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/saas/errors";
import { getComponentDefinition, isComponentType, canParentType, styleSchema } from "@/lib/saas/page-builder/component-registry";
import { isNodeOrAncestor, type PageNodeLike } from "@/lib/saas/page-builder/tree-validation";
import { validateNodePropsBindings } from "@/services/saas/data-binding.service";
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
  updatedAt: Date;
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

/** Shape-validates props against the Component Registry, then (Phase 3C) re-validates any Dynamic binding inside them against this project's actual Data Models/Fields — never trusting a modelId/fieldKey just because it's well-formed. */
async function assertValidProps(projectId: string, type: string, props: unknown): Promise<Record<string, unknown>> {
  if (!isComponentType(type)) throw new ValidationError(`Unknown component type "${type}".`);
  const definition = getComponentDefinition(type);
  const parsed = definition.propsSchema.safeParse(props);
  if (!parsed.success) {
    throw new ValidationError(`Invalid properties for "${definition.label}": ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
  }
  const validated = parsed.data as Record<string, unknown>;
  await validateNodePropsBindings(projectId, type, validated);
  return validated;
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
  /** Optimistic-concurrency guard: when given, the update is rejected with a ConflictError if the node was changed since this timestamp (see AGENTS.md Phase 3B "Concurrent Save Safety"). */
  expectedUpdatedAt?: string;
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
  if (input.props !== undefined) data.props = (await assertValidProps(projectId, node.type, input.props)) as Prisma.InputJsonValue;
  if (input.styles !== undefined) data.styles = assertValidStyles(input.styles) as Prisma.InputJsonValue;
  if (input.settings !== undefined) data.settings = input.settings as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    if (input.expectedUpdatedAt !== undefined) {
      const current = await tx.saasPageNode.findUniqueOrThrow({ where: { id: nodeId }, select: { updatedAt: true } });
      if (current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new ConflictError("This component was changed elsewhere. Reload the page to see the latest version.");
      }
    }
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

/**
 * Moves a node to a (possibly different) parent, optionally at a specific
 * sibling index — omit `position` to append at the end. Rejects moving the
 * root, moving into itself/a descendant, or into a non-container/
 * incompatible parent. Always fully re-derives sibling positions (both the
 * source and destination sibling lists) inside the transaction rather than
 * incrementing/decrementing individual rows, so a move can never leave two
 * siblings sharing a position — the same "recompute from scratch" approach
 * `reorderPageNodes` already uses.
 */
export async function movePageNode(
  userId: string,
  projectId: string,
  pageId: string,
  nodeId: string,
  newParentId: string,
  position?: number
) {
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
    const newSiblings = await tx.saasPageNode.findMany({
      where: { pageId, parentId: newParentId, id: { not: nodeId } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const targetPosition = position === undefined ? newSiblings.length : Math.max(0, Math.min(position, newSiblings.length));
    const newOrder = newSiblings.map((s) => s.id);
    newOrder.splice(targetPosition, 0, nodeId);

    await tx.saasPageNode.update({ where: { id: nodeId }, data: { parentId: newParentId, position: targetPosition } });
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i] === nodeId) continue;
      await tx.saasPageNode.update({ where: { id: newOrder[i] }, data: { position: i } });
    }

    if (node.parentId !== newParentId) {
      const oldSiblings = await tx.saasPageNode.findMany({
        where: { pageId, parentId: node.parentId, id: { not: nodeId } },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      for (let i = 0; i < oldSiblings.length; i++) {
        await tx.saasPageNode.update({ where: { id: oldSiblings[i].id }, data: { position: i } });
      }
    }

    const updated = await tx.saasPageNode.findUniqueOrThrow({ where: { id: nodeId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_moved",
        entity: "Page",
        entityId: pageId,
        metadata: { nodeId, newParentId, position: targetPosition },
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

/** A plain, serializable snapshot of a node subtree — captured client-side before a delete (for Undo) or read server-side from an existing node (for Duplicate), then replayed through the same validated creation path. */
export interface RestoreNodeInput {
  type: string;
  props: Record<string, unknown>;
  styles: Record<string, unknown>;
  settings: Record<string, unknown>;
  children: RestoreNodeInput[];
}

async function createSubtreeRecursive(
  tx: Prisma.TransactionClient,
  projectId: string,
  pageId: string,
  parentId: string,
  position: number,
  subtree: RestoreNodeInput,
  collected: PageNodeRow[]
): Promise<PageNodeRow> {
  if (!isComponentType(subtree.type)) throw new ValidationError(`Unknown component type "${subtree.type}".`);
  if (subtree.type === "ROOT") throw new ValidationError("A page can only ever have one Root node.");

  const props = await assertValidProps(projectId, subtree.type, subtree.props);
  const styles = assertValidStyles(subtree.styles);
  const node = await tx.saasPageNode.create({
    data: {
      pageId,
      parentId,
      type: subtree.type,
      props: props as Prisma.InputJsonValue,
      styles: styles as Prisma.InputJsonValue,
      settings: (subtree.settings ?? {}) as Prisma.InputJsonValue,
      position,
    },
  });
  collected.push(node);
  for (let i = 0; i < subtree.children.length; i++) {
    await createSubtreeRecursive(tx, projectId, pageId, node.id, i, subtree.children[i], collected);
  }
  return node;
}

export interface CreatedSubtree {
  root: PageNodeRow;
  /** Every row created, root included — the client needs the real (server-assigned) id of each descendant too, since it can't invent them locally. */
  all: PageNodeRow[];
}

/** Inserts a whole subtree under `parentId` at `position` (default: append), shifting later siblings down first. Shared by duplicatePageNode and restorePageNodeSubtree — the only two places a subtree is created wholesale instead of one empty default-props node at a time. */
async function insertSubtreeAt(
  tx: Prisma.TransactionClient,
  projectId: string,
  pageId: string,
  parentId: string,
  position: number | undefined,
  subtree: RestoreNodeInput
): Promise<CreatedSubtree> {
  const siblingCount = await tx.saasPageNode.count({ where: { pageId, parentId } });
  const targetPosition = position === undefined ? siblingCount : Math.max(0, Math.min(position, siblingCount));
  if (targetPosition < siblingCount) {
    await tx.saasPageNode.updateMany({
      where: { pageId, parentId, position: { gte: targetPosition } },
      data: { position: { increment: 1 } },
    });
  }
  const collected: PageNodeRow[] = [];
  const root = await createSubtreeRecursive(tx, projectId, pageId, parentId, targetPosition, subtree, collected);
  return { root, all: collected };
}

function captureSubtree(
  allNodes: { id: string; parentId: string | null; type: string; props: unknown; styles: unknown; settings: unknown; position: number }[],
  nodeId: string
): RestoreNodeInput {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) throw new NotFoundError("Component not found.");
  const children = allNodes.filter((n) => n.parentId === nodeId).sort((a, b) => a.position - b.position);
  return {
    type: node.type,
    props: (node.props ?? {}) as Record<string, unknown>,
    styles: (node.styles ?? {}) as Record<string, unknown>,
    settings: (node.settings ?? {}) as Record<string, unknown>,
    children: children.map((c) => captureSubtree(allNodes, c.id)),
  };
}

/** Clones a node (and its whole subtree) as a new sibling placed right after the original — same props/styles/settings, fresh ids throughout. The Root cannot be duplicated. */
export async function duplicatePageNode(userId: string, projectId: string, pageId: string, nodeId: string) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const node = await requireNodeInPage(pageId, nodeId);
  if (node.parentId === null) throw new ValidationError("The root component cannot be duplicated.");

  const allNodes = await prisma.saasPageNode.findMany({ where: { pageId } });
  const subtree = captureSubtree(allNodes, nodeId);

  return prisma.$transaction(async (tx) => {
    const created = await insertSubtreeAt(tx, projectId, pageId, node.parentId as string, node.position + 1, subtree);
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_duplicated",
        entity: "Page",
        entityId: pageId,
        metadata: { sourceNodeId: nodeId, newNodeId: created.root.id, type: node.type },
      },
      tx
    );
    return created;
  });
}

/**
 * Recreates a subtree the Editor captured client-side before deleting it —
 * the server-side half of "Undo Delete". Every node in the snapshot is
 * revalidated against the Component Registry exactly like a normal create,
 * since this data is client-supplied and must never be trusted blindly.
 */
export async function restorePageNodeSubtree(
  userId: string,
  projectId: string,
  pageId: string,
  parentId: string,
  subtree: RestoreNodeInput,
  position?: number
) {
  const { access } = await requirePageInProject(userId, projectId, pageId, "page.update" satisfies PermissionKey);
  const parent = await requireNodeInPage(pageId, parentId);

  if (!isComponentType(subtree.type)) throw new ValidationError(`Unknown component type "${subtree.type}".`);
  if (subtree.type === "ROOT") throw new ValidationError("A page can only ever have one Root node.");
  if (!isComponentType(parent.type) || !canParentType(parent.type, subtree.type)) {
    throw new ValidationError("This component cannot be placed inside the selected parent.");
  }

  return prisma.$transaction(async (tx) => {
    const created = await insertSubtreeAt(tx, projectId, pageId, parentId, position, subtree);
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "page.node_restored",
        entity: "Page",
        entityId: pageId,
        metadata: { newNodeId: created.root.id, type: subtree.type, parentId },
      },
      tx
    );
    return created;
  });
}
