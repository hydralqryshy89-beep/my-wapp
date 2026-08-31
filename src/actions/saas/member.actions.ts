"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import {
  addOrganizationMember,
  addProjectMember,
  changeOrganizationMemberRole,
  changeProjectMemberRole,
  removeOrganizationMember,
  removeProjectMember,
} from "@/services/saas/member.service";
import {
  addOrganizationMemberSchema,
  addProjectMemberSchema,
  changeOrganizationMemberRoleSchema,
  changeProjectMemberRoleSchema,
} from "@/validators/saas";

export async function addOrganizationMemberAction(
  organizationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = addOrganizationMemberSchema.safeParse({
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await addOrganizationMember(user.id, organizationId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/organizations/${organizationId}/members`);
  return undefined;
}

export async function removeOrganizationMemberAction(
  organizationId: string,
  memberId: string,
  _prevState: string | undefined
): Promise<string | undefined> {
  void _prevState;
  const user = await requireAuth();
  try {
    await removeOrganizationMember(user.id, organizationId, memberId);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/organizations/${organizationId}/members`);
  return undefined;
}

export async function changeOrganizationMemberRoleAction(
  organizationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = changeOrganizationMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await changeOrganizationMemberRole(user.id, organizationId, parsed.data.memberId, parsed.data.roleId);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/organizations/${organizationId}/members`);
  return undefined;
}

export async function addProjectMemberAction(
  projectId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = addProjectMemberSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await addProjectMember(user.id, projectId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/projects/${projectId}/members`);
  return undefined;
}

export async function removeProjectMemberAction(
  projectId: string,
  memberId: string,
  _prevState: string | undefined
): Promise<string | undefined> {
  void _prevState;
  const user = await requireAuth();
  try {
    await removeProjectMember(user.id, projectId, memberId);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/projects/${projectId}/members`);
  return undefined;
}

export async function changeProjectMemberRoleAction(
  projectId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = changeProjectMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await changeProjectMemberRole(user.id, projectId, parsed.data.memberId, parsed.data.roleId);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/saas/projects/${projectId}/members`);
  return undefined;
}
