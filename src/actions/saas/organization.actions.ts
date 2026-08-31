"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { createOrganization, updateOrganization } from "@/services/saas/organization.service";
import { createOrganizationSchema, updateOrganizationSchema } from "@/validators/saas";

export async function createOrganizationAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = createOrganizationSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  let organizationId: string;
  try {
    const organization = await createOrganization(user.id, { name: parsed.data.name });
    organizationId = organization.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/saas/organizations");
  redirect(`/saas/organizations/${organizationId}`);
}

export async function updateOrganizationAction(
  organizationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    logo: formData.get("logo"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updateOrganization(user.id, organizationId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/organizations/${organizationId}`);
  revalidatePath(`/saas/organizations/${organizationId}/settings`);
  return undefined;
}
