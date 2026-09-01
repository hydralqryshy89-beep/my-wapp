"use client";

import { useState } from "react";
import { Plus, GitBranch } from "lucide-react";
import { RELATION_TYPE_LABELS } from "@/lib/saas/data-constants";
import { deleteDataRelationAction } from "@/actions/saas/data-relation.actions";
import { Button } from "@/components/saas/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/saas/ui/table";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";
import { RelationFormPanel } from "@/components/saas/data/relation-form-panel";

interface ModelWithFields {
  id: string;
  name: string;
  fields: { id: string; name: string }[];
}

interface RelationRow {
  id: string;
  name: string;
  type: string;
  fromModelId: string;
  toModelId: string;
  fromModel: { name: string };
  toModel: { name: string };
}

export function RelationManager({
  projectId,
  modelId,
  currentModel,
  otherModels,
  relations,
  canManage,
}: {
  projectId: string;
  modelId: string;
  currentModel: ModelWithFields;
  otherModels: ModelWithFields[];
  relations: RelationRow[];
  canManage: boolean;
}) {
  const [panel, setPanel] = useState<"new" | string | null>(null);
  const editingRelation = panel && panel !== "new" ? relations.find((r) => r.id === panel) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {relations.length === 0 && panel !== "new" ? (
        <EmptyState
          icon={GitBranch}
          title="No relations yet"
          description={
            otherModels.length === 0
              ? "Create another data model first to connect it here."
              : "Connect this data model to another one."
          }
          action={
            canManage &&
            otherModels.length > 0 && (
              <Button size="sm" onClick={() => setPanel("new")}>
                <Plus size={16} />
                Add Relation
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Direction</Th>
              <Th>Type</Th>
              {canManage && <Th />}
            </Tr>
          </Thead>
          <Tbody>
            {relations.map((relation) => (
              <Tr key={relation.id}>
                <Td className="font-medium text-slate-900">{relation.name}</Td>
                <Td>
                  {relation.fromModel.name} → {relation.toModel.name}
                </Td>
                <Td>{RELATION_TYPE_LABELS[relation.type as keyof typeof RELATION_TYPE_LABELS] ?? relation.type}</Td>
                {canManage && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setPanel(relation.id)}>
                        Edit
                      </Button>
                      <ConfirmSubmitButton
                        action={deleteDataRelationAction.bind(null, projectId, modelId, relation.id)}
                        confirmText={`Delete the "${relation.name}" relation?`}
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

      {canManage && relations.length > 0 && panel === null && otherModels.length > 0 && (
        <div>
          <Button size="sm" variant="outline" onClick={() => setPanel("new")}>
            <Plus size={16} />
            Add Relation
          </Button>
        </div>
      )}

      {canManage && panel === "new" && (
        <RelationFormPanel
          projectId={projectId}
          modelId={modelId}
          currentModel={currentModel}
          otherModels={otherModels}
          mode="create"
          onCancel={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      )}
      {canManage && editingRelation && (
        <RelationFormPanel
          projectId={projectId}
          modelId={modelId}
          currentModel={currentModel}
          otherModels={otherModels}
          mode="edit"
          existingRelation={editingRelation}
          onCancel={() => setPanel(null)}
          onSaved={() => setPanel(null)}
        />
      )}
    </div>
  );
}
