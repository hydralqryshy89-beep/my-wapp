"use server";

import { requireAuth } from "@/lib/saas/authorization";
import { toActionError } from "@/lib/saas/errors";
import { requirePageInProject } from "@/services/saas/page-shared";
import { getDataModels } from "@/services/saas/data-model.service";
import { requireModelInProject } from "@/services/saas/data-shared";
import { listRecordOptionsForModel } from "@/services/saas/data-record.service";
import type { PermissionKey } from "@/lib/saas/constants";

export interface BindableModelInfo {
  id: string;
  name: string;
  fields: { id: string; key: string; name: string; type: string }[];
}

/** The project's own Data Models (with their fields) for the Properties Panel's binding UI — never another project's. */
export async function listBindableModelsAction(projectId: string, pageId: string): Promise<{ error?: string; models?: BindableModelInfo[] }> {
  const user = await requireAuth();
  try {
    await requirePageInProject(user.id, projectId, pageId, "page.view" satisfies PermissionKey);
    const models = await getDataModels(user.id, projectId);
    return {
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        fields: m.fields.map((f) => ({ id: f.id, key: f.key, name: f.name, type: f.type })),
      })),
    };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

/** A single representative record for the Editor's live Canvas/Preview — the most recently created record of `modelId`, or null if it has none yet. Fetched once per distinct model a page's bindings actually reference (see AGENTS.md Phase 3C "Data Fetching"), never per keystroke/hover/drag. */
export async function getPreviewRecordAction(
  projectId: string,
  pageId: string,
  modelId: string
): Promise<{ error?: string; record?: { id: string; data: Record<string, unknown> } | null }> {
  const user = await requireAuth();
  try {
    await requirePageInProject(user.id, projectId, pageId, "page.view" satisfies PermissionKey);
    await requireModelInProject(user.id, projectId, modelId, "data_record.view" satisfies PermissionKey);
    const options = await listRecordOptionsForModel(modelId);
    return { record: options[0] ? { id: options[0].id, data: options[0].data } : null };
  } catch (error) {
    return { error: toActionError(error) };
  }
}
