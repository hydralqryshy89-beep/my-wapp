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
} from "@/services/saas/page-node.service";
import { pageNodeCreateSchema, pageNodeUpdateSchema, pageNodeMoveSchema } from "@/validators/saas-page";

function revalidateEditor(projectId: string, pageId: string) {
  revalidatePath(`/saas/projects/${projectId}/pages/${pageId}`);
}

export async function createPageNodeAction(
  projectId: string,
  pageId: string,
  input: { parentId: string; type: string }
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = pageNodeCreateSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await createPageNode(user.id, projectId, pageId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidateEditor(projectId, pageId);
  return undefined;
}

export async function updatePageNodeAction(
  projectId: string,
  pageId: string,
  nodeId: string,
  input: { props?: Record<string, unknown>; styles?: Record<string, unknown>; settings?: Record<string, unknown> }
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = pageNodeUpdateSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updatePageNode(user.id, projectId, pageId, nodeId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidateEditor(projectId, pageId);
  return undefined;
}

export async function deletePageNodeAction(projectId: string, pageId: string, nodeId: string): Promise<string | undefined> {
  const user = await requireAuth();
  try {
    await deletePageNode(user.id, projectId, pageId, nodeId);
  } catch (error) {
    return toActionError(error);
  }

  revalidateEditor(projectId, pageId);
  return undefined;
}

export async function movePageNodeAction(
  projectId: string,
  pageId: string,
  nodeId: string,
  newParentId: string
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = pageNodeMoveSchema.safeParse({ newParentId });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await movePageNode(user.id, projectId, pageId, nodeId, parsed.data.newParentId);
  } catch (error) {
    return toActionError(error);
  }

  revalidateEditor(projectId, pageId);
  return undefined;
}

export async function reorderPageNodesAction(
  projectId: string,
  pageId: string,
  parentId: string,
  orderedNodeIds: string[]
): Promise<string | undefined> {
  const user = await requireAuth();
  try {
    await reorderPageNodes(user.id, projectId, pageId, parentId, orderedNodeIds);
  } catch (error) {
    return toActionError(error);
  }

  revalidateEditor(projectId, pageId);
  return undefined;
}
