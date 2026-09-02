"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { getComponentDefinition } from "@/lib/saas/page-builder/component-registry";
import { buildNodeTree, type FlatPageNode, type PageTreeNode } from "@/lib/saas/page-builder/build-tree";
import { resolveNodeTree } from "@/lib/saas/page-builder/resolve-node-bindings";
import type { BindingContext } from "@/lib/saas/page-builder/binding-schema";
import { PageRenderer } from "@/components/saas/pages/page-renderer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import type { DropZone } from "@/components/saas/pages/page-editor-dnd";
import type { Device } from "@/components/saas/pages/use-page-editor-state";

const DEVICE_WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "375px" };

function NodeWrapper({
  node,
  rendered,
  rootId,
  selectedId,
  hoveredId,
  dropZone,
  canEdit,
  onSelect,
  onHover,
}: {
  node: PageTreeNode;
  rendered: React.ReactNode;
  rootId: string;
  selectedId: string | null;
  hoveredId: string | null;
  dropZone: DropZone | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const isRoot = node.id === rootId;
  const definition = getComponentDefinition(node.type);
  const draggable = useDraggable({ id: node.id, data: { source: "node", nodeId: node.id, type: node.type }, disabled: !canEdit || isRoot });
  const droppable = useDroppable({ id: node.id, disabled: !canEdit });

  const isSelected = selectedId === node.id;
  const isHovered = hoveredId === node.id && !isSelected;
  const zone = dropZone?.targetId === node.id ? dropZone.zone : null;

  return (
    <div
      ref={(el) => {
        draggable.setNodeRef(el);
        droppable.setNodeRef(el);
      }}
      {...(isRoot ? {} : draggable.listeners)}
      {...(isRoot ? {} : draggable.attributes)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover(node.id);
      }}
      onMouseLeave={() => onHover(null)}
      data-node-id={node.id}
      style={{
        position: "relative",
        cursor: isRoot || !canEdit ? "default" : "grab",
        opacity: draggable.isDragging ? 0.35 : 1,
        outline: isSelected ? "2px solid #4f46e5" : isHovered ? "1px dashed #94a3b8" : "1px solid transparent",
        outlineOffset: "-1px",
        boxShadow:
          zone === "before"
            ? "inset 0 3px 0 0 #4f46e5"
            : zone === "after"
              ? "inset 0 -3px 0 0 #4f46e5"
              : zone === "inside"
                ? "inset 0 0 0 2px #4f46e5"
                : undefined,
        minHeight: definition.canHaveChildren && node.children.length === 0 ? "32px" : undefined,
      }}
    >
      {(isSelected || isHovered) && (
        <span
          style={{
            position: "absolute",
            top: -18,
            left: -1,
            fontSize: 10,
            lineHeight: 1,
            background: isSelected ? "#4f46e5" : "#64748b",
            color: "#fff",
            padding: "2px 5px",
            borderRadius: "3px 3px 0 0",
            zIndex: 30,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {definition.label}
        </span>
      )}
      {rendered}
      {definition.canHaveChildren && node.children.length === 0 && (
        <div style={{ padding: "8px", fontSize: 11, color: "#94a3b8", textAlign: "center", pointerEvents: "none" }}>Drop components here</div>
      )}
    </div>
  );
}

/**
 * The visual Canvas: the actual page, rendered by the same PageRenderer the
 * standalone Preview uses, with selection/hover/drag/drop layered on via
 * PageRenderer's `wrap` hook — never a second, parallel rendering path.
 */
export function PageCanvas({
  nodes,
  rootId,
  selectedId,
  hoveredId,
  dropZone,
  device,
  canEdit,
  bindingContext,
  onSelect,
  onHover,
}: {
  nodes: FlatPageNode[];
  rootId: string;
  selectedId: string | null;
  hoveredId: string | null;
  dropZone: DropZone | null;
  device: Device;
  canEdit: boolean;
  bindingContext: BindingContext;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const tree = resolveNodeTree(buildNodeTree(nodes), bindingContext);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canvas</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center overflow-x-auto bg-slate-50 p-6">
        <div
          className="min-h-[400px] w-full rounded-lg border border-slate-200 bg-white transition-[width]"
          style={{ maxWidth: DEVICE_WIDTH[device] }}
          onClick={() => onSelect(rootId)}
        >
          <PageRenderer
            node={tree}
            wrap={(node, rendered) => (
              <NodeWrapper
                key={node.id}
                node={node}
                rendered={rendered}
                rootId={rootId}
                selectedId={selectedId}
                hoveredId={hoveredId}
                dropZone={dropZone}
                canEdit={canEdit}
                onSelect={onSelect}
                onHover={onHover}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
