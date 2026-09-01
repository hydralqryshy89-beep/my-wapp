"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { createDataRecord, updateDataRecord, deleteDataRecord } from "@/services/saas/data-record.service";
import { dataRecordDataSchema } from "@/validators/saas-data";
import type { RecordJson } from "@/lib/saas/record-validation";

async function getFieldsForForm(modelId: string) {
  return prisma.saasDataField.findMany({ where: { modelId }, orderBy: { position: "asc" } });
}

/**
 * Reads the dynamic form's fields off FormData according to the model's
 * real field list — the create/edit forms always render every field, so a
 * BOOLEAN checkbox is always read explicitly (unchecked = false, never
 * "untouched"); other types are included only when actually present, which
 * also lets a genuinely partial caller rely on updateDataRecord's merge.
 */
function readRecordFormData(fields: Awaited<ReturnType<typeof getFieldsForForm>>, formData: FormData): RecordJson {
  const data: RecordJson = {};

  for (const field of fields) {
    switch (field.type) {
      case "BOOLEAN":
        data[field.key] = formData.get(field.key) === "on";
        break;
      case "MULTI_SELECT": {
        const values = formData.getAll(`${field.key}[]`);
        if (values.length > 0 || formData.has(`${field.key}__touched`)) {
          data[field.key] = values.map(String);
        }
        break;
      }
      case "FILE": {
        const url = formData.get(`${field.key}__url`);
        const name = formData.get(`${field.key}__name`);
        if (typeof url === "string" && url.trim()) {
          data[field.key] = {
            url: url.trim(),
            name: typeof name === "string" && name.trim() ? name.trim() : url.trim(),
            size: Number(formData.get(`${field.key}__size`) ?? 0) || 0,
            type: String(formData.get(`${field.key}__type`) ?? "") || "application/octet-stream",
          };
        }
        break;
      }
      default: {
        // The create/edit forms always render a control for every field, so
        // an empty value here is a deliberate "clear this field" (or, for a
        // required field, a validation error) — never "field not touched".
        // record-validation.ts turns this into "omit" on create and "delete
        // the key" on update (see updateDataRecord's merge).
        const raw = formData.get(field.key);
        if (raw !== null) data[field.key] = raw === "" ? null : raw;
      }
    }
  }

  return data;
}

export async function createDataRecordAction(
  projectId: string,
  modelId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const fields = await getFieldsForForm(modelId);
  const parsed = dataRecordDataSchema.safeParse(readRecordFormData(fields, formData));
  if (!parsed.success) return "Invalid input.";

  let recordId: string;
  try {
    const record = await createDataRecord(user.id, projectId, modelId, { data: parsed.data as RecordJson });
    recordId = record.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}/records`);
  redirect(`/saas/projects/${projectId}/data/${modelId}/records/${recordId}`);
}

export async function updateDataRecordAction(
  projectId: string,
  modelId: string,
  recordId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const fields = await getFieldsForForm(modelId);
  const parsed = dataRecordDataSchema.safeParse(readRecordFormData(fields, formData));
  if (!parsed.success) return "Invalid input.";

  try {
    await updateDataRecord(user.id, projectId, modelId, recordId, { data: parsed.data as RecordJson });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}/records/${recordId}`);
  revalidatePath(`/saas/projects/${projectId}/data/${modelId}/records`);
  redirect(`/saas/projects/${projectId}/data/${modelId}/records/${recordId}`);
}

export async function deleteDataRecordAction(
  projectId: string,
  modelId: string,
  recordId: string,
  _prevState: string | undefined
): Promise<string | undefined> {
  void _prevState;
  const user = await requireAuth();
  try {
    await deleteDataRecord(user.id, projectId, modelId, recordId);
  } catch (error) {
    // Caught deliberately (not left to the error boundary) so a blocked
    // delete — e.g. "referenced by another record" — shows inline instead
    // of a generic error page (see AGENTS.md section 48).
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}/records`);
  redirect(`/saas/projects/${projectId}/data/${modelId}/records`);
}
