import { prisma } from "@/lib/prisma";
import { requireProjectContext, requirePermission } from "@/lib/saas/authorization";
import { requireFieldInModel } from "@/services/saas/data-shared";
import { NotFoundError, ValidationError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";
import type { PermissionKey } from "@/lib/saas/constants";
import type { RelationType } from "@/lib/saas/data-constants";

export interface CreateRelationInput {
  name: string;
  fromModelId: string;
  fromFieldId: string;
  toModelId: string;
  toFieldId: string;
  type: RelationType;
}

/** Self-relations are out of scope for Phase 2A (see AGENTS.md section 16) and both models must belong to the caller's own project — never trust model IDs from the client. */
async function requireRelationModelsInProject(projectId: string, fromModelId: string, toModelId: string) {
  if (fromModelId === toModelId) {
    throw new ValidationError("A model cannot be related to itself yet.");
  }
  const models = await prisma.saasDataModel.findMany({
    where: { id: { in: [fromModelId, toModelId] }, projectId },
    select: { id: true },
  });
  if (models.length !== 2) {
    throw new ValidationError("Both models must belong to this project.");
  }
}

export async function createRelation(userId: string, projectId: string, input: CreateRelationInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_relation.create" satisfies PermissionKey);

  await requireRelationModelsInProject(projectId, input.fromModelId, input.toModelId);
  await requireFieldInModel(input.fromModelId, input.fromFieldId);
  await requireFieldInModel(input.toModelId, input.toFieldId);

  return prisma.$transaction(async (tx) => {
    const relation = await tx.saasDataRelation.create({
      data: {
        projectId,
        name: input.name,
        fromModelId: input.fromModelId,
        fromFieldId: input.fromFieldId,
        toModelId: input.toModelId,
        toFieldId: input.toFieldId,
        type: input.type,
      },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_relation.created",
        entity: "DataRelation",
        entityId: relation.id,
        metadata: { name: relation.name, fromModelId: input.fromModelId, toModelId: input.toModelId, type: input.type },
      },
      tx
    );
    return relation;
  });
}

/** Every relation in the project — the Model Editor's Relations tab filters this by modelId client-side. */
export async function getRelations(userId: string, projectId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_relation.view" satisfies PermissionKey);

  return prisma.saasDataRelation.findMany({
    where: { projectId },
    include: { fromModel: true, toModel: true, fromField: true, toField: true },
    orderBy: { createdAt: "asc" },
  });
}

export interface UpdateRelationInput {
  name: string;
  type: RelationType;
}

export async function updateRelation(userId: string, projectId: string, relationId: string, input: UpdateRelationInput) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_relation.update" satisfies PermissionKey);

  const relation = await prisma.saasDataRelation.findUnique({ where: { id: relationId } });
  if (!relation || relation.projectId !== projectId) throw new NotFoundError("Relation not found.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasDataRelation.update({
      where: { id: relationId },
      data: { name: input.name, type: input.type },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_relation.updated",
        entity: "DataRelation",
        entityId: relationId,
        metadata: { name: updated.name, type: updated.type },
      },
      tx
    );
    return updated;
  });
}

export async function deleteRelation(userId: string, projectId: string, relationId: string) {
  const access = await requireProjectContext(userId, projectId);
  requirePermission(access.permissions, "data_relation.delete" satisfies PermissionKey);

  const relation = await prisma.saasDataRelation.findUnique({ where: { id: relationId } });
  if (!relation || relation.projectId !== projectId) throw new NotFoundError("Relation not found.");

  return prisma.$transaction(async (tx) => {
    await tx.saasDataRelation.delete({ where: { id: relationId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_relation.deleted",
        entity: "DataRelation",
        entityId: relationId,
        metadata: { name: relation.name },
      },
      tx
    );
  });
}
