"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import {
  createDataField,
  updateDataField,
  deleteDataField,
  reorderDataFields,
  type FieldDefaultValue,
} from "@/services/saas/data-field.service";
import { dataFieldCreateSchema, dataFieldUpdateSchema } from "@/validators/saas-data";
import { NUMERIC_FIELD_TYPES, OPTION_BASED_FIELD_TYPES } from "@/lib/saas/data-constants";

function parseOptions(formData: FormData, type: string): string[] | null {
  if (!(OPTION_BASED_FIELD_TYPES as readonly string[]).includes(type)) return null;
  const raw = formData.get("options");
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDefaultValue(formData: FormData, type: string): FieldDefaultValue {
  if (type === "BOOLEAN") return formData.get("defaultValue") === "on";
  const raw = formData.get("defaultValue");
  if (typeof raw !== "string" || raw === "") return null;
  if ((NUMERIC_FIELD_TYPES as readonly string[]).includes(type)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

function parseValidation(formData: FormData, type: string): Record<string, string | number | boolean> | null {
  const num = (key: string): number | undefined => {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  if (type === "TEXT" || type === "LONG_TEXT") {
    const minLength = num("validationMinLength");
    const maxLength = num("validationMaxLength");
    if (minLength === undefined && maxLength === undefined) return null;
    return { ...(minLength !== undefined && { minLength }), ...(maxLength !== undefined && { maxLength }) };
  }
  if ((NUMERIC_FIELD_TYPES as readonly string[]).includes(type)) {
    const min = num("validationMin");
    const max = num("validationMax");
    if (min === undefined && max === undefined) return null;
    return { ...(min !== undefined && { min }), ...(max !== undefined && { max }) };
  }
  return null;
}

function readFieldInput(formData: FormData) {
  const type = String(formData.get("type") ?? "");
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    unique: formData.get("unique") === "on",
    defaultValue: parseDefaultValue(formData, type),
    options: parseOptions(formData, type),
    validation: parseValidation(formData, type),
    description: formData.get("description"),
  };
}

export async function createDataFieldAction(
  projectId: string,
  modelId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataFieldCreateSchema.safeParse(readFieldInput(formData));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await createDataField(user.id, projectId, modelId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}

export async function updateDataFieldAction(
  projectId: string,
  modelId: string,
  fieldId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAuth();
  const parsed = dataFieldUpdateSchema.safeParse(readFieldInput(formData));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  try {
    await updateDataField(user.id, projectId, modelId, fieldId, parsed.data);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}

export async function deleteDataFieldAction(
  projectId: string,
  modelId: string,
  fieldId: string,
  _prevState: string | undefined
): Promise<string | undefined> {
  void _prevState;
  const user = await requireAuth();
  try {
    await deleteDataField(user.id, projectId, modelId, fieldId);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}

export async function reorderDataFieldsAction(
  projectId: string,
  modelId: string,
  orderedFieldIds: string[]
): Promise<string | undefined> {
  const user = await requireAuth();
  try {
    await reorderDataFields(user.id, projectId, modelId, orderedFieldIds);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/saas/projects/${projectId}/data/${modelId}`);
  return undefined;
}
