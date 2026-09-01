"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { createRelation, updateRelation, deleteRelation } from "@/services/saas/data-relation.service";
import { dataRelationCreateSchema, dataRelationUpdateSchema } from "@/validators/saas-data";

export async function createDataRelationAction(
  projectId: string,
  modelId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataRelationCreateSchema.safeParse({
    name: formData.get("name"),
    fromModelId: modelId,
    fromFieldId: formData.get("fromFieldId"),
    toModelId: formData.get("toModelId"),
    toFieldId: formData.get("toFieldId"),
    type: formData.get("type"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await createRelation(user.id, projectId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}

export async function updateDataRelationAction(
  projectId: string,
  modelId: string,
  relationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataRelationUpdateSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updateRelation(user.id, projectId, relationId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}

export async function deleteDataRelationAction(
  projectId: string,
  modelId: string,
  relationId: string,
  _prevState: string | undefined
): Promise<string | undefined> {
  void _prevState;
  const user = await requireAuth();
  try {
    await deleteRelation(user.id, projectId, relationId);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}
