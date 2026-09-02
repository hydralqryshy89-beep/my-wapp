"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import {
  createPageNode,
  updatePageNode,
  deletePageNode,
  movePageNode,
  reorderPageNodes,
  duplicatePageNode,
  restorePageNodeSubtree,
  type RestoreNodeInput,
} from "@/services/saas/page-node.service";
import {
  pageNodeCreateSchema,
  pageNodeUpdateSchema,
  pageNodeMoveSchema,
  pageNodeReorderSchema,
  pageNodeRestoreSchema,
} from "@/validators/saas-page";

function revalidateEditor(projectId: string, pageId: string) {
  revalidatePath(`/saas/projects/${projectId}/pages/${pageId}`);
}

export interface MutationResult {
  error?: string;
  nodeId?: string;
  updatedAt?: string;
}

export interface SerializedNode {
  id: string;
  parentId: string | null;
  type: string;
  props: unknown;
  styles: unknown;
  settings: unknown;
  position: number;
  updatedAt: string;
}

export interface SubtreeMutationResult {
  error?: string;
  rootId?: string;
  /** Every row the server actually created (root + descendants) — a client-invented id for a descendant would never match the real row, so the whole subtree comes back with its real ids. */
  nodes?: SerializedNode[];
}

function serializeNode(node: { id: string; parentId: string | null; type: string; props: unknown; styles: unknown; settings: unknown; position: number; updatedAt: Date }): SerializedNode {
  return {
    id: node.id,
    parentId: node.parentId,
    type: node.type,
    props: node.props,
    styles: node.styles,
    settings: node.settings,
    position: node.position,
    updatedAt: node.updatedAt.toISOString(),
  };
}

export async function createPageNodeAction(
  projectId: string,
  pageId: string,
  input: { parentId: string; type: string }
): Promise<MutationResult> {
  const user = await requireAuth();
  const parsed = pageNodeCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const node = await createPageNode(user.id, projectId, pageId, parsed.data);
    revalidateEditor(projectId, pageId);
    return { nodeId: node.id, updatedAt: node.updatedAt.toISOString() };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function updatePageNodeAction(
  projectId: string,
  pageId: string,
  nodeId: string,
  input: {
    props?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    expectedUpdatedAt?: string;
  }
): Promise<MutationResult> {
  const user = await requireAuth();
  const parsed = pageNodeUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const updated = await updatePageNode(user.id, projectId, pageId, nodeId, parsed.data);
    revalidateEditor(projectId, pageId);
    return { nodeId: updated.id, updatedAt: updated.updatedAt.toISOString() };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function deletePageNodeAction(projectId: string, pageId: string, nodeId: string): Promise<MutationResult> {
  const user = await requireAuth();
  try {
    await deletePageNode(user.id, projectId, pageId, nodeId);
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidateEditor(projectId, pageId);
  return {};
}

export async function movePageNodeAction(
  projectId: string,
  pageId: string,
  nodeId: string,
  newParentId: string,
  position?: number
): Promise<MutationResult> {
  const user = await requireAuth();
  const parsed = pageNodeMoveSchema.safeParse({ newParentId, position });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const updated = await movePageNode(user.id, projectId, pageId, nodeId, parsed.data.newParentId, parsed.data.position);
    revalidateEditor(projectId, pageId);
    return { nodeId: updated.id, updatedAt: updated.updatedAt.toISOString() };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function reorderPageNodesAction(
  projectId: string,
  pageId: string,
  parentId: string,
  orderedNodeIds: string[]
): Promise<MutationResult> {
  const user = await requireAuth();
  const parsed = pageNodeReorderSchema.safeParse({ parentId, orderedNodeIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await reorderPageNodes(user.id, projectId, pageId, parsed.data.parentId, parsed.data.orderedNodeIds);
  } catch (error) {
    return { error: toActionError(error) };
  }

  revalidateEditor(projectId, pageId);
  return {};
}

export async function duplicatePageNodeAction(projectId: string, pageId: string, nodeId: string): Promise<SubtreeMutationResult> {
  const user = await requireAuth();
  try {
    const created = await duplicatePageNode(user.id, projectId, pageId, nodeId);
    revalidateEditor(projectId, pageId);
    return { rootId: created.root.id, nodes: created.all.map(serializeNode) };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function restorePageNodeSubtreeAction(
  projectId: string,
  pageId: string,
  parentId: string,
  subtree: RestoreNodeInput,
  position?: number
): Promise<SubtreeMutationResult> {
  const user = await requireAuth();
  const parsed = pageNodeRestoreSchema.safeParse({ parentId, subtree, position });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const created = await restorePageNodeSubtree(
      user.id,
      projectId,
      pageId,
      parsed.data.parentId,
      parsed.data.subtree as RestoreNodeInput,
      parsed.data.position
    );
    revalidateEditor(projectId, pageId);
    return { rootId: created.root.id, nodes: created.all.map(serializeNode) };
  } catch (error) {
    return { error: toActionError(error) };
  }
}
