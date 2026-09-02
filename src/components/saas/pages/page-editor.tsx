"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { usePageEditorState } from "@/components/saas/pages/use-page-editor-state";
import { computeDropZone, type DragData, type DropZone } from "@/components/saas/pages/page-editor-dnd";
import { getComponentDefinition, canParentType, type ComponentType } from "@/lib/saas/page-builder/component-registry";
import { childrenOf, findNode, getDescendantIds } from "@/lib/saas/page-builder/local-tree-ops";
import { buildNodeTree } from "@/lib/saas/page-builder/build-tree";
import { resolveNodeTree } from "@/lib/saas/page-builder/resolve-node-bindings";
import { PageToolbar } from "@/components/saas/pages/page-toolbar";
import { PagePalette } from "@/components/saas/pages/page-palette";
import { PageCanvas } from "@/components/saas/pages/page-canvas";
import { PageLayers } from "@/components/saas/pages/page-layers";
import { PagePropertiesPanel } from "@/components/saas/pages/page-properties-panel";
import { PageRenderer } from "@/components/saas/pages/page-renderer";
import { Alert } from "@/components/saas/ui/alert";
import type { Device } from "@/components/saas/pages/use-page-editor-state";
import type { PageNodeRow } from "@/services/saas/page-node.service";

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "375px" };

/**
 * The orchestrator: owns the DndContext (Palette and Canvas both live
 * inside it, so a component can be dragged from one into the other),
 * translates drag/drop gestures into the editor-state hook's operations,
 * and lays out Toolbar / Palette+Layers / Canvas / Properties. It renders
 * nothing structural itself — every mutation goes through the hook, which
 * is the only thing that talks to Server Actions.
 */
export function PageEditor({
  projectId,
  pageId,
  nodes: initialNodes,
  canEdit,
}: {
  projectId: string;
  pageId: string;
  nodes: PageNodeRow[];
  canEdit: boolean;
}) {
  const editor = usePageEditorState(projectId, pageId, initialNodes, canEdit);
  const [view, setView] = useState<"editor" | "preview">("editor");
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!editor.root) {
    return <Alert>This page has no root component. Please reload the page.</Alert>;
  }

  function insertionParentId(): string {
    const selected = editor.selected ?? editor.root;
    if (!selected) return editor.rootId;
    const definition = getComponentDefinition(selected.type);
    return definition.canHaveChildren ? selected.id : (selected.parentId ?? editor.rootId);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData;
    if (data.source === "palette") {
      setActiveDragLabel(getComponentDefinition(data.type).label);
    } else {
      const node = findNode(editor.nodes, data.nodeId);
      setActiveDragLabel(node ? getComponentDefinition(node.type).label : "Component");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setDropZone(null);
      return;
    }
    const targetId = String(over.id);
    const targetNode = findNode(editor.nodes, targetId);
    const draggedRect = active.rect.current.translated ?? active.rect.current.initial;
    if (!targetNode || !draggedRect) {
      setDropZone(null);
      return;
    }
    const definition = getComponentDefinition(targetNode.type);
    const zone = computeDropZone(draggedRect, over.rect, definition.canHaveChildren, targetNode.parentId === null);
    setDropZone({ targetId, zone });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragLabel(null);
    const zone = dropZone;
    setDropZone(null);
    if (!over || !zone || zone.targetId !== String(over.id)) return;

    const data = active.data.current as DragData;
    const targetNode = findNode(editor.nodes, zone.targetId);
    if (!targetNode) return;

    const parentIdForInside = zone.zone === "inside" ? targetNode.id : targetNode.parentId;
    if (!parentIdForInside) return;
    const parentNode = findNode(editor.nodes, parentIdForInside);
    if (!parentNode) return;

    if (data.source === "palette") {
      if (!canParentType(parentNode.type as ComponentType, data.type)) return;
      void editor.addNode(parentIdForInside, data.type);
      return;
    }

    const draggedId = data.nodeId;
    const draggedNode = findNode(editor.nodes, draggedId);
    if (!draggedNode || draggedNode.parentId === null) return;
    if (draggedId === parentIdForInside) return;
    if (getDescendantIds(editor.nodes, draggedId).has(parentIdForInside)) return;
    if (!canParentType(parentNode.type as ComponentType, draggedNode.type as ComponentType)) return;

    let position: number;
    if (zone.zone === "inside") {
      position = childrenOf(editor.nodes, targetNode.id).length;
    } else if (zone.zone === "before") {
      position = targetNode.position;
    } else {
      position = targetNode.position + 1;
    }

    if (draggedNode.parentId === parentIdForInside) {
      const siblingIds = childrenOf(editor.nodes, parentIdForInside)
        .map((n) => n.id)
        .filter((id) => id !== draggedId);
      const clamped = Math.max(0, Math.min(position, siblingIds.length));
      siblingIds.splice(clamped, 0, draggedId);
      void editor.reorderSiblings(parentIdForInside, siblingIds);
    } else {
      void editor.moveNode(draggedId, parentIdForInside, position);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragLabel(null);
        setDropZone(null);
      }}
    >
      <PageToolbar
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={() => void editor.undo()}
        onRedo={() => void editor.redo()}
        status={editor.status}
        dirty={editor.dirty}
        onSaveNow={() => void editor.flushPendingEdit()}
        view={view}
        onViewChange={setView}
        device={editor.device}
        onDeviceChange={editor.setDevice}
      />

      {editor.status === "error" && editor.errorMessage && (
        <div className="mb-4">
          <Alert>{editor.errorMessage}</Alert>
        </div>
      )}

      {view === "preview" ? (
        <div className="flex justify-center overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div
            className="w-full rounded-lg border border-slate-200 bg-white p-6 transition-[max-width]"
            style={{ maxWidth: DEVICE_WIDTH[editor.device] }}
          >
            <PageRenderer node={resolveNodeTree(buildNodeTree(editor.nodes), editor.bindingContext)} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
          <div className="flex flex-col gap-4">
            <PagePalette canEdit={canEdit} onAdd={(type) => void editor.addNode(insertionParentId(), type)} />
            <PageLayers
              nodes={editor.nodes}
              root={editor.root}
              selectedId={editor.selectedId}
              hoveredId={editor.hoveredId}
              onSelect={editor.setSelectedId}
              onHover={editor.setHoveredId}
              onMoveUpDown={(node, direction) => {
                if (!node.parentId) return;
                const siblings = childrenOf(editor.nodes, node.parentId);
                const index = siblings.findIndex((n) => n.id === node.id);
                const targetIndex = index + direction;
                if (targetIndex < 0 || targetIndex >= siblings.length) return;
                const order = siblings.map((n) => n.id);
                [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
                void editor.reorderSiblings(node.parentId, order);
              }}
              onDelete={(id) => void editor.deleteNode(id)}
              onDuplicate={(id) => void editor.duplicateNode(id)}
              canEdit={canEdit}
            />
          </div>

          <PageCanvas
            nodes={editor.nodes}
            rootId={editor.rootId}
            selectedId={editor.selectedId}
            hoveredId={editor.hoveredId}
            dropZone={dropZone}
            device={editor.device}
            canEdit={canEdit}
            bindingContext={editor.bindingContext}
            onSelect={editor.setSelectedId}
            onHover={editor.setHoveredId}
          />

          <PagePropertiesPanel
            node={editor.selected}
            canEdit={canEdit}
            bindableModels={editor.bindableModels}
            bindingContext={editor.bindingContext}
            onChangeProps={editor.updateProps}
            onChangeStyles={editor.updateStyles}
          />
        </div>
      )}

      <DragOverlay>
        {activeDragLabel && (
          <div className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">{activeDragLabel}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
