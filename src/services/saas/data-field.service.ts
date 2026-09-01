import { prisma } from "@/lib/prisma";
import { toSnakeCaseKey, withNumericSuffix } from "@/lib/saas/slug";
import { requireModelInProject, requireFieldInModel } from "@/services/saas/data-shared";
import { NotFoundError, ConflictError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";
import type { PermissionKey } from "@/lib/saas/constants";
import type { FieldType } from "@/lib/saas/data-constants";
import type { Prisma } from "@/generated/prisma/client";

async function generateUniqueFieldKey(modelId: string, name: string): Promise<string> {
  const base = toSnakeCaseKey(name) || "field";
  let candidate = base;
  let n = 2;
  while (await prisma.saasDataField.findUnique({ where: { modelId_key: { modelId, key: candidate } } })) {
    candidate = withNumericSuffix(base, n++);
  }
  return candidate;
}

export type FieldDefaultValue = string | number | boolean | null;

export interface DataFieldInput {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: FieldDefaultValue;
  options?: string[] | null;
  validation?: Record<string, string | number | boolean> | null;
  description?: string | null;
}

function toFieldRow(input: DataFieldInput) {
  return {
    type: input.type,
    required: input.required ?? false,
    unique: input.unique ?? false,
    defaultValue: (input.defaultValue ?? null) as Prisma.InputJsonValue,
    options: (input.options ?? null) as Prisma.InputJsonValue,
    validation: (input.validation ?? null) as Prisma.InputJsonValue,
    settings: (input.description ? { description: input.description } : null) as Prisma.InputJsonValue,
  };
}

/** Creates the field with the next position in the model, atomically. */
export async function createDataField(userId: string, projectId: string, modelId: string, input: DataFieldInput) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_field.create" satisfies PermissionKey);

  const key = await generateUniqueFieldKey(modelId, input.name);
  const position = await prisma.saasDataField.count({ where: { modelId } });

  return prisma.$transaction(async (tx) => {
    const field = await tx.saasDataField.create({
      data: { modelId, name: input.name, key, position, ...toFieldRow(input) },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_field.created",
        entity: "DataField",
        entityId: field.id,
        metadata: { modelId, name: field.name, key: field.key, type: field.type },
      },
      tx
    );
    return field;
  });
}

export async function getDataField(userId: string, projectId: string, modelId: string, fieldId: string) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_field.view" satisfies PermissionKey);
  const field = await requireFieldInModel(modelId, fieldId);
  return { field, access };
}

export async function updateDataField(
  userId: string,
  projectId: string,
  modelId: string,
  fieldId: string,
  input: DataFieldInput
) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_field.update" satisfies PermissionKey);
  await requireFieldInModel(modelId, fieldId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.saasDataField.update({
      where: { id: fieldId },
      data: { name: input.name, ...toFieldRow(input) },
    });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_field.updated",
        entity: "DataField",
        entityId: fieldId,
        metadata: { modelId, name: updated.name, type: updated.type },
      },
      tx
    );
    return updated;
  });
}

/** Blocked if the field anchors a relation — the relation must be removed first (see AGENTS.md Phase 2A section 34). */
export async function deleteDataField(userId: string, projectId: string, modelId: string, fieldId: string) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_field.delete" satisfies PermissionKey);
  const field = await requireFieldInModel(modelId, fieldId);

  const usedByRelation = await prisma.saasDataRelation.count({
    where: { OR: [{ fromFieldId: fieldId }, { toFieldId: fieldId }] },
  });
  if (usedByRelation > 0) {
    throw new ConflictError("This field is used by a relation. Remove the relation first.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.saasDataField.delete({ where: { id: fieldId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_field.deleted",
        entity: "DataField",
        entityId: fieldId,
        metadata: { modelId, name: field.name, key: field.key },
      },
      tx
    );
  });
}

export async function reorderDataFields(
  userId: string,
  projectId: string,
  modelId: string,
  orderedFieldIds: string[]
) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_field.update" satisfies PermissionKey);

  const fields = await prisma.saasDataField.findMany({ where: { modelId, id: { in: orderedFieldIds } } });
  if (fields.length !== orderedFieldIds.length) throw new NotFoundError("One or more fields not found.");

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedFieldIds.length; i++) {
      await tx.saasDataField.update({ where: { id: orderedFieldIds[i] }, data: { position: i } });
    }
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_field.reordered",
        entity: "DataModel",
        entityId: modelId,
        metadata: { order: orderedFieldIds },
      },
      tx
    );
  });
}
