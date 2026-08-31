"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { archiveProject, createProject, updateProject } from "@/services/saas/project.service";
import { createProjectSchema, updateProjectSchema } from "@/validators/saas";

export async function createProjectAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = createProjectSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  let projectId: string;
  try {
    const project = await createProject(user.id, parsed.data.organizationId, {
      name: parsed.data.name,
      description: parsed.data.description,
      icon: parsed.data.icon,
    });
    projectId = project.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/saas/projects");
  redirect(`/saas/projects/${projectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updateProject(user.id, projectId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}`);
  revalidatePath(`/saas/projects/${projectId}/settings`);
  return undefined;
}

export async function archiveProjectAction(projectId: string, _formData: FormData) {
  void _formData;
  const user = await requireAuth();
  await archiveProject(user.id, projectId);
  revalidatePath("/saas/projects");
  revalidatePath(`/saas/projects/${projectId}`);
  redirect("/saas/projects");
}
