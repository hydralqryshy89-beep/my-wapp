"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { createPage, updatePage, deletePage } from "@/services/saas/page.service";
import { pageCreateSchema, pageUpdateSchema } from "@/validators/saas-page";

export async function createPageAction(
  projectId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = pageCreateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  let pageId: string;
  try {
    const page = await createPage(user.id, projectId, parsed.data);
    pageId = page.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/pages`);
  redirect(`/saas/projects/${projectId}/pages/${pageId}`);
}

export async function updatePageAction(
  projectId: string,
  pageId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = pageUpdateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updatePage(user.id, projectId, pageId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/pages/${pageId}`);
  revalidatePath(`/saas/projects/${projectId}/pages`);
  return undefined;
}

export async function deletePageAction(projectId: string, pageId: string, _formData: FormData) {
  void _formData;
  const user = await requireAuth();
  await deletePage(user.id, projectId, pageId);
  revalidatePath(`/saas/projects/${projectId}/pages`);
  redirect(`/saas/projects/${projectId}/pages`);
}
