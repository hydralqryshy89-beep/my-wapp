import { prisma } from "@/lib/prisma";
import { requireProjectContext, requirePermission } from "@/lib/saas/authorization";
import { NotFoundError } from "@/lib/saas/errors";
import type { PermissionKey } from "@/lib/saas/constants";

/** Shared by data-model/data-field/data-relation services: resolves + authorizes project access, then verifies the model actually belongs to that project. Never trust a modelId alone. */
export async function requireModelInProject(
  userId: string,
  projectId: string,
  modelId: string,
  permission: PermissionKey
) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, permission);

  const model = await prisma.saasDataModel.findUnique({ where: { id: modelId } });
  if (!model || model.projectId !== projectId) throw new NotFoundError("Data model not found.");

  return { access, model };
}

/** Verifies a field actually belongs to the given model. Never trust a fieldId alone. */
export async function requireFieldInModel(modelId: string, fieldId: string) {
  const field = await prisma.saasDataField.findUnique({ where: { id: fieldId } });
  if (!field || field.modelId !== modelId) throw new NotFoundError("Field not found.");
  return field;
}
