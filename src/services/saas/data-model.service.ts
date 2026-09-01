import { prisma } from "@/lib/prisma";
import { toSnakeCaseKey, withNumericSuffix } from "@/lib/saas/slug";
import { requireProjectContext, requirePermission } from "@/lib/saas/authorization";
import { requireModelInProject } from "@/services/saas/data-shared";
import { NotFoundError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";
import type { PermissionKey } from "@/lib/saas/constants";

async function generateUniqueModelSlug(projectId: string, name: string): Promise<string> {
  const base = toSnakeCaseKey(name) || "model";
  let candidate = base;
  let n = 2;
  while (
    await prisma.saasDataModel.findUnique({ where: { projectId_slug: { projectId, slug: candidate } } })
  ) {
    candidate = withNumericSuffix(base, n++);
  }
  return candidate;
}

export interface CreateDataModelInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

/** Creates the model with the next position in the project, atomically. */
export async function createDataModel(userId: string, projectId: string, input: CreateDataModelInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_model.create" satisfies PermissionKey);

  const slug = await generateUniqueModelSlug(projectId, input.name);
  const position = await prisma.saasDataModel.count({ where: { projectId } });

  return prisma.$transaction(async (tx) => {
    const model = await tx.saasDataModel.create({
      data: {
        projectId,
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
        position,
      },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_model.created",
        entity: "DataModel",
        entityId: model.id,
        metadata: { name: model.name, slug: model.slug },
      },
      tx
    );
    return model;
  });
}

export async function getDataModels(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_model.view" satisfies PermissionKey);

  return prisma.saasDataModel.findMany({
    where: { projectId },
    include: { fields: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });
}

export async function getDataModel(userId: string, projectId: string, modelId: string) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_model.view" satisfies PermissionKey);

  const model = await prisma.saasDataModel.findUniqueOrThrow({
    where: { id: modelId },
    include: { fields: { orderBy: { position: "asc" } } },
  });
  return { model, access };
}

export interface UpdateDataModelInput {
  name: string;
  description?: string | null;
  icon?: string | null;
}

export async function updateDataModel(
  userId: string,
  projectId: string,
  modelId: string,
  input: UpdateDataModelInput
) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_model.update" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasDataModel.update({
      where: { id: modelId },
      data: { name: input.name, description: input.description ?? null, icon: input.icon ?? null },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_model.updated",
        entity: "DataModel",
        entityId: modelId,
        metadata: { name: updated.name },
      },
      tx
    );
    return updated;
  });
}

/** Deletes the model and, safely, any relations touching it (never leaving orphans) plus its fields — all in one transaction. */
export async function deleteDataModel(userId: string, projectId: string, modelId: string) {
  const { access, model } = await requireModelInProject(userId, projectId, modelId, "data_model.delete" satisfies PermissionKey);

  return prisma.$transaction(async (tx) => {
    const { count: relationsRemoved } = await tx.saasDataRelation.deleteMany({
      where: { OR: [{ fromModelId: modelId }, { toModelId: modelId }] },
    });
    await tx.saasDataField.deleteMany({ where: { modelId } });
    await tx.saasDataModel.delete({ where: { id: modelId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_model.deleted",
        entity: "DataModel",
        entityId: modelId,
        metadata: { name: model.name, slug: model.slug, relationsRemoved },
      },
      tx
    );
  });
}

export async function reorderDataModels(userId: string, projectId: string, orderedModelIds: string[]) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_model.update" satisfies PermissionKey);

  const models = await prisma.saasDataModel.findMany({ where: { projectId, id: { in: orderedModelIds } } });
  if (models.length !== orderedModelIds.length) throw new NotFoundError("One or more data models not found.");

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedModelIds.length; i++) {
      await tx.saasDataModel.update({ where: { id: orderedModelIds[i] }, data: { position: i } });
    }
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_model.reordered",
        entity: "Project",
        entityId: projectId,
        metadata: { order: orderedModelIds },
      },
      tx
    );
  });
}
