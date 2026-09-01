"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { createDataModel, updateDataModel, deleteDataModel } from "@/services/saas/data-model.service";
import { dataModelCreateSchema, dataModelUpdateSchema } from "@/validators/saas-data";

export async function createDataModelAction(
  projectId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataModelCreateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  let modelId: string;
  try {
    const model = await createDataModel(user.id, projectId, parsed.data);
    modelId = model.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data`);
  redirect(`/saas/projects/${projectId}/data/${modelId}`);
}

export async function updateDataModelAction(
  projectId: string,
  modelId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataModelUpdateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updateDataModel(user.id, projectId, modelId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  revalidatePath(`/saas/projects/${projectId}/data`);
  return undefined;
}

export async function deleteDataModelAction(projectId: string, modelId: string, _formData: FormData) {
  void _formData;
  const user = await requireAuth();
  await deleteDataModel(user.id, projectId, modelId);
  revalidatePath(`/saas/projects/${projectId}/data`);
  redirect(`/saas/projects/${projectId}/data`);
}
