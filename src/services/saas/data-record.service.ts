import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModelInProject } from "@/services/saas/data-shared";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/saas/errors";
import { recordAuditLog } from "@/services/saas/audit.service";
import { validateRecordInput, type DataFieldDef, type RecordJson } from "@/lib/saas/record-validation";
import { computeRecordLabel } from "@/lib/saas/record-display";
import { queryDataRecords, countDataRecords, type QueryInput, type QueryResult } from "@/services/saas/data-query.service";
import type { PermissionKey } from "@/lib/saas/constants";

/** Relations touching this model, either direction — used to interpret record data, never exposed directly (see data-relation.service.ts's permission-gated getRelations for that). */
async function getModelRelations(projectId: string, modelId: string) {
  return prisma.saasDataRelation.findMany({
    where: { projectId, OR: [{ fromModelId: modelId }, { toModelId: modelId }] },
    include: { fromField: true, toField: true },
  });
}

function outgoingRelations(modelId: string, relations: Awaited<ReturnType<typeof getModelRelations>>) {
  return relations.filter((r) => r.fromModelId === modelId);
}

function isMultiValueRelation(type: string): boolean {
  return type === "MANY_TO_MANY" || type === "ONE_TO_MANY";
}

/**
 * Validates that every relation-anchor value in `data` (only keys actually
 * present) points to a real record in the relation's target model — the
 * target model already only ever belongs to this same project (Phase 2A's
 * createRelation enforces that at definition time), so this transitively
 * blocks cross-project references too (see AGENTS.md section 41).
 */
async function validateRelationValues(
  projectId: string,
  modelId: string,
  data: RecordJson,
  relations: Awaited<ReturnType<typeof getModelRelations>>
): Promise<void> {
  for (const relation of outgoingRelations(modelId, relations)) {
    const key = relation.fromField.key;
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const raw = data[key];
    if (raw == null) continue;

    if (isMultiValueRelation(relation.type)) {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
        throw new ValidationError(`"${relation.name}" must be a list of record ids.`);
      }
      const ids = raw as string[];
      if (ids.length > 0) {
        const found = await prisma.saasDataRecord.count({ where: { id: { in: ids }, modelId: relation.toModelId } });
        if (found !== new Set(ids).size) {
          throw new ValidationError(`"${relation.name}" references a record that doesn't exist.`);
        }
      }
    } else {
      if (typeof raw !== "string") throw new ValidationError(`"${relation.name}" must be a record id.`);
      const found = await prisma.saasDataRecord.findFirst({ where: { id: raw, modelId: relation.toModelId } });
      if (!found) throw new ValidationError(`"${relation.name}" references a record that doesn't exist.`);
    }
  }
}

/** Depth-1 relation resolution (section 42/43) — targets are returned as-is, never themselves resolved further. */
export interface ResolvedRelation {
  relationId: string;
  name: string;
  type: string;
  toModelId: string;
  toModelName: string;
  value: { id: string; data: RecordJson } | { id: string; data: RecordJson }[] | null;
}

export async function resolveRecordRelations(
  projectId: string,
  modelId: string,
  record: { data: RecordJson }
): Promise<ResolvedRelation[]> {
  const relations = await getModelRelations(projectId, modelId);
  const resolved: ResolvedRelation[] = [];

  for (const relation of outgoingRelations(modelId, relations)) {
    const raw = record.data[relation.fromField.key];
    const toModel = await prisma.saasDataModel.findUnique({ where: { id: relation.toModelId }, select: { name: true } });

    if (raw == null) {
      resolved.push({
        relationId: relation.id,
        name: relation.name,
        type: relation.type,
        toModelId: relation.toModelId,
        toModelName: toModel?.name ?? "",
        value: null,
      });
      continue;
    }

    if (isMultiValueRelation(relation.type)) {
      const ids = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
      const targets = ids.length
        ? await prisma.saasDataRecord.findMany({ where: { id: { in: ids }, modelId: relation.toModelId } })
        : [];
      resolved.push({
        relationId: relation.id,
        name: relation.name,
        type: relation.type,
        toModelId: relation.toModelId,
        toModelName: toModel?.name ?? "",
        value: targets.map((t) => ({ id: t.id, data: t.data as RecordJson })),
      });
    } else {
      const id = typeof raw === "string" ? raw : null;
      const target = id ? await prisma.saasDataRecord.findFirst({ where: { id, modelId: relation.toModelId } }) : null;
      resolved.push({
        relationId: relation.id,
        name: relation.name,
        type: relation.type,
        toModelId: relation.toModelId,
        toModelName: toModel?.name ?? "",
        value: target ? { id: target.id, data: target.data as RecordJson } : null,
      });
    }
  }
  return resolved;
}

/**
 * Blocks deleting a record that another record still points to (section
 * 48) — no cascade semantics are defined for Phase 2B, so the safe default
 * is to refuse rather than silently orphan or cascade-delete data.
 */
async function assertRecordNotReferenced(projectId: string, modelId: string, recordId: string): Promise<void> {
  const relations = await getModelRelations(projectId, modelId);
  for (const relation of relations.filter((r) => r.toModelId === modelId)) {
    const referenced = isMultiValueRelation(relation.type)
      ? await prisma.saasDataRecord.findFirst({
          where: { modelId: relation.fromModelId, data: { path: [relation.fromField.key], array_contains: recordId } },
          select: { id: true },
        })
      : await prisma.saasDataRecord.findFirst({
          where: { modelId: relation.fromModelId, data: { path: [relation.fromField.key], equals: recordId } },
          select: { id: true },
        });
    if (referenced) throw new ConflictError("This record is referenced by another record.");
  }
}

/**
 * Reduces (does not eliminate with absolute certainty) the race window
 * between checking a unique value and inserting it: the whole check+write
 * runs inside one Serializable transaction, so Postgres aborts one side of
 * a genuine conflict with a serialization failure instead of letting both
 * succeed. We deliberately do NOT add a Postgres UNIQUE constraint on the
 * JSON path itself — that would need a per-field, per-model expression
 * index created/dropped dynamically whenever a field's `unique` flag or key
 * changes, which is real DDL-management complexity Phase 2B's scope
 * excludes (see AGENTS.md sections 24/71). This is the documented
 * limitation the spec asks for.
 */
async function assertUniqueFieldValues(
  tx: Prisma.TransactionClient,
  modelId: string,
  fields: DataFieldDef[],
  data: RecordJson,
  excludeRecordId?: string
): Promise<void> {
  for (const field of fields) {
    if (!field.unique) continue;
    if (!Object.prototype.hasOwnProperty.call(data, field.key)) continue;
    const value = data[field.key];
    if (value == null) continue;

    const existing = await tx.saasDataRecord.findFirst({
      where: {
        modelId,
        id: excludeRecordId ? { not: excludeRecordId } : undefined,
        data: { path: [field.key], equals: value as Prisma.InputJsonValue },
      },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`"${field.name}" must be unique — this value is already used.`);
  }
}

async function getOrderedFields(modelId: string): Promise<DataFieldDef[]> {
  return prisma.saasDataField.findMany({ where: { modelId }, orderBy: { position: "asc" } });
}

export interface CreateDataRecordInput {
  data: RecordJson;
}

export async function createDataRecord(userId: string, projectId: string, modelId: string, input: CreateDataRecordInput) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_record.create" satisfies PermissionKey);
  const fields = await getOrderedFields(modelId);
  const relations = await getModelRelations(projectId, modelId);
  const anchorKeys = new Set(outgoingRelations(modelId, relations).map((r) => r.fromField.key));

  const normalized = validateRecordInput(fields, input.data, { partial: false, relationAnchorKeys: anchorKeys });
  await validateRelationValues(projectId, modelId, normalized, relations);

  return prisma.$transaction(
    async (tx) => {
      await assertUniqueFieldValues(tx, modelId, fields, normalized);
      const record = await tx.saasDataRecord.create({
        data: { modelId, data: normalized as Prisma.InputJsonValue, createdById: userId },
      });
      await recordAuditLog(
        {
          organizationId: access.organizationId,
          projectId,
          userId,
          action: "data_record.created",
          entity: "DataRecord",
          entityId: record.id,
          metadata: { modelId },
        },
        tx
      );
      return record;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function getDataRecord(userId: string, projectId: string, modelId: string, recordId: string) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_record.view" satisfies PermissionKey);
  const record = await prisma.saasDataRecord.findUnique({ where: { id: recordId } });
  if (!record || record.modelId !== modelId) throw new NotFoundError("Record not found.");

  const data = record.data as RecordJson;
  const relations = await resolveRecordRelations(projectId, modelId, { data });
  return {
    record: { id: record.id, data, createdAt: record.createdAt, updatedAt: record.updatedAt },
    relations,
    access,
  };
}

export async function getDataRecords(
  userId: string,
  projectId: string,
  modelId: string,
  input: QueryInput
): Promise<QueryResult & { access: Awaited<ReturnType<typeof requireModelInProject>>["access"]; fields: DataFieldDef[] }> {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_record.view" satisfies PermissionKey);
  const fields = await getOrderedFields(modelId);
  const result = await queryDataRecords(modelId, fields, input);
  return { ...result, access, fields };
}

/** Cheap record count for a model overview card — never fetches the records themselves (section 79). */
export async function countDataRecordsForModel(userId: string, projectId: string, modelId: string): Promise<number> {
  await requireModelInProject(userId, projectId, modelId, "data_record.view" satisfies PermissionKey);
  const fields = await getOrderedFields(modelId);
  return countDataRecords(modelId, fields, {});
}

export interface UpdateDataRecordInput {
  data: RecordJson;
}

export async function updateDataRecord(
  userId: string,
  projectId: string,
  modelId: string,
  recordId: string,
  input: UpdateDataRecordInput
) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_record.update" satisfies PermissionKey);
  const existing = await prisma.saasDataRecord.findUnique({ where: { id: recordId } });
  if (!existing || existing.modelId !== modelId) throw new NotFoundError("Record not found.");

  const fields = await getOrderedFields(modelId);
  const relations = await getModelRelations(projectId, modelId);
  const anchorKeys = new Set(outgoingRelations(modelId, relations).map((r) => r.fromField.key));

  const partial = validateRecordInput(fields, input.data, { partial: true, relationAnchorKeys: anchorKeys });
  await validateRelationValues(projectId, modelId, partial, relations);

  const existingData = existing.data as RecordJson;
  const merged: RecordJson = { ...existingData, ...partial };
  // `null` in `partial` means "clear this field" (see record-validation.ts)
  // — delete the key rather than storing a literal null, so a field is
  // always either present-with-a-value or absent, never ambiguously null.
  for (const [key, value] of Object.entries(partial)) {
    if (value === null) delete merged[key];
  }
  const changedFields = Object.keys(partial).filter(
    (key) => JSON.stringify(existingData[key]) !== JSON.stringify(merged[key])
  );

  return prisma.$transaction(
    async (tx) => {
      await assertUniqueFieldValues(tx, modelId, fields, partial, recordId);
      const updated = await tx.saasDataRecord.update({
        where: { id: recordId },
        data: { data: merged as Prisma.InputJsonValue, updatedById: userId },
      });
      await recordAuditLog(
        {
          organizationId: access.organizationId,
          projectId,
          userId,
          action: "data_record.updated",
          entity: "DataRecord",
          entityId: recordId,
          metadata: { modelId, changedFields },
        },
        tx
      );
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function deleteDataRecord(userId: string, projectId: string, modelId: string, recordId: string) {
  const { access } = await requireModelInProject(userId, projectId, modelId, "data_record.delete" satisfies PermissionKey);
  const existing = await prisma.saasDataRecord.findUnique({ where: { id: recordId } });
  if (!existing || existing.modelId !== modelId) throw new NotFoundError("Record not found.");

  await assertRecordNotReferenced(projectId, modelId, recordId);

  return prisma.$transaction(async (tx) => {
    await tx.saasDataRecord.delete({ where: { id: recordId } });
    await recordAuditLog(
      {
        organizationId: access.organizationId,
        projectId,
        userId,
        action: "data_record.deleted",
        entity: "DataRecord",
        entityId: recordId,
        metadata: { modelId },
      },
      tx
    );
  });
}

/** Per-model record counts in one query — used by the Data Models list page (section 79); never fetches the records themselves. */
export async function countDataRecordsByModelIds(modelIds: string[]): Promise<Record<string, number>> {
  if (modelIds.length === 0) return {};
  const rows = await prisma.saasDataRecord.groupBy({
    by: ["modelId"],
    where: { modelId: { in: modelIds } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.modelId, r._count._all]));
}

export interface RelationAnchorMeta {
  relationName: string;
  toModelId: string;
  toModelName: string;
  isMulti: boolean;
}

/** Which of this model's own fields anchor an outgoing relation, and what they point to — used to render a record picker instead of a raw id input (section 55-57). */
export async function getRelationAnchorsForModel(projectId: string, modelId: string): Promise<Record<string, RelationAnchorMeta>> {
  const relations = await getModelRelations(projectId, modelId);
  const result: Record<string, RelationAnchorMeta> = {};
  for (const relation of outgoingRelations(modelId, relations)) {
    const toModel = await prisma.saasDataModel.findUnique({ where: { id: relation.toModelId }, select: { name: true } });
    result[relation.fromField.key] = {
      relationName: relation.name,
      toModelId: relation.toModelId,
      toModelName: toModel?.name ?? "",
      isMulti: isMultiValueRelation(relation.type),
    };
  }
  return result;
}

/** A capped preview of a model's existing records, for populating a relation picker — not the query engine (no search/filter/pagination needed here). */
export async function listRecordOptionsForModel(modelId: string): Promise<{ id: string; data: RecordJson }[]> {
  const rows = await prisma.saasDataRecord.findMany({ where: { modelId }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map((r) => ({ id: r.id, data: r.data as RecordJson }));
}

export interface RelationAnchorInfo {
  relationName: string;
  toModelName: string;
  isMulti: boolean;
  options: { id: string; label: string }[];
}

/** Combines the two helpers above into what the record form needs, given the project's already-fetched model list (each with its own fields). */
export async function getRelationAnchorInfoForForm(
  projectId: string,
  modelId: string,
  allModelsWithFields: { id: string; fields: { key: string; type: string }[] }[]
): Promise<Record<string, RelationAnchorInfo>> {
  const anchors = await getRelationAnchorsForModel(projectId, modelId);
  const result: Record<string, RelationAnchorInfo> = {};
  for (const [fieldKey, meta] of Object.entries(anchors)) {
    const targetFields = allModelsWithFields.find((m) => m.id === meta.toModelId)?.fields ?? [];
    const options = await listRecordOptionsForModel(meta.toModelId);
    result[fieldKey] = {
      relationName: meta.relationName,
      toModelName: meta.toModelName,
      isMulti: meta.isMulti,
      options: options.map((o) => ({ id: o.id, label: computeRecordLabel(targetFields, o.data, o.id) })),
    };
  }
  return result;
}
