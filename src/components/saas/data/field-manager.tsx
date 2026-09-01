"use client";

import { useState } from "react";
import { Plus, ChevronUp, ChevronDown, ListChecks } from "lucide-react";
import { FIELD_TYPE_LABELS } from "@/lib/saas/data-constants";
import { deleteDataFieldAction, reorderDataFieldsAction } from "@/actions/saas/data-field.actions";
import { Button } from "@/components/saas/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/saas/ui/table";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";
import { FieldFormPanel } from "@/components/saas/data/field-form-panel";

interface FieldRow {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue: unknown;
  options: unknown;
  validation: unknown;
  settings: unknown;
}

export function FieldManager({
  projectId,
  modelId,
  fields,
  canManage,
}: {
  projectId: string;
  modelId: string;
  fields: FieldRow[];
  canManage: boolean;
}) {
  const [panel, setPanel] = useState<"new" | string | null>(null);

  async function moveField(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const order = fields.map((f) => f.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    await reorderDataFieldsAction(projectId, modelId, order);
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && panel !== "new" ? (
        <EmptyState
          icon={ListChecks}
          title="This data model has no fields"
          description="Add a field to start defining its structure."
          action={
            canManage && (
              <Button size="sm" onClick={() => setPanel("new")}>
                <Plus size={16} />
                Add Field
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Required</Th>
              <Th>Unique</Th>
              {canManage && <Th />}
            </Tr>
          </Thead>
          <Tbody>
            {fields.map((field, index) => (
              <Tr key={field.id}>
                <Td className="font-medium text-slate-900">
                  {field.name}
                  <div className="text-xs font-normal text-slate-400">{field.key}</div>
                </Td>
                <Td>{FIELD_TYPE_LABELS[field.type as keyof typeof FIELD_TYPE_LABELS] ?? field.type}</Td>
                <Td>{field.required ? "Required" : "Optional"}</Td>
                <Td>{field.unique ? "Yes" : "No"}</Td>
                {canManage && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(index, 1)}
                        disabled={index === fields.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => setPanel(field.id)}>
                        Edit
                      </Button>
                      <ConfirmSubmitButton
                        action={deleteDataFieldAction.bind(null, projectId, modelId, field.id)}
                        confirmText={`Delete the "${field.name}" field?`}
                        label="Delete"
                        pendingLabel="Deleting..."
                      />
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {canManage && fields.length > 0 && panel === null && (
        <div>
          <Button size="sm" variant="outline" onClick={() => setPanel("new")}>
            <Plus size={16} />
            Add Field
          </Button>
        </div>
      )}

      {canManage && panel === "new" && (
        <FieldFormPanel projectId={projectId} modelId={modelId} mode="create" onCancel={() => setPanel(null)} onSaved={() => setPanel(null)} />
      )}
      {canManage && panel && panel !== "new" && (
        <FieldFormPanel
          projectId={projectId}
          modelId={modelId}
          mode="edit"
          existingField={fields.find((f) => f.id === panel)!}
          onCancel={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      )}
    </div>
  );
}
