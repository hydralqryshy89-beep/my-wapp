"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Copy, Trash2 } from "lucide-react";
import { getComponentDefinition } from "@/lib/saas/page-builder/component-registry";
import { childrenOf, type EditorNode } from "@/lib/saas/page-builder/local-tree-ops";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { cn } from "@/lib/utils";

function nodePreview(node: EditorNode): string {
  if (typeof node.props.text === "string" && node.props.text) return `"${node.props.text.slice(0, 24)}"`;
  if (typeof node.props.src === "string" && node.props.src) return node.props.src.slice(0, 24);
  return "";
}

/**
 * The structural tree view — the Canvas is now a visual render (see
 * page-canvas.tsx), so this panel is where hierarchy, expand/collapse, and
 * ordering live. Built straight from the flat node list, never from a
 * separate copy of the tree.
 */
export function PageLayers({
  nodes,
  root,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onMoveUpDown,
  onDelete,
  onDuplicate,
  canEdit,
}: {
  nodes: EditorNode[];
  root: EditorNode;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMoveUpDown: (node: EditorNode, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  canEdit: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderRow(node: EditorNode, depth: number): ReactNode {
    const definition = getComponentDefinition(node.type);
    const children = childrenOf(nodes, node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isSelected = node.id === selectedId;
    const isHovered = node.id === hoveredId;
    const siblings = childrenOf(nodes, node.parentId ?? "");
    const index = siblings.findIndex((n) => n.id === node.id);

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-1 text-sm",
            isSelected ? "bg-indigo-50 text-indigo-900" : isHovered ? "bg-slate-50" : ""
          )}
          style={{ marginLeft: depth * 14 }}
          onMouseEnter={() => onHover(node.id)}
          onMouseLeave={() => onHover(null)}
        >
          <button
            type="button"
            onClick={() => toggle(node.id)}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
            className={cn("flex h-4 w-4 shrink-0 items-center justify-center text-slate-400", !hasChildren && "invisible")}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left">
            <span className="font-medium">{definition.label}</span>
            {nodePreview(node) && <span className="ml-1.5 truncate text-slate-400">{nodePreview(node)}</span>}
          </button>
          {canEdit && node.parentId !== null && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label="Move up"
                disabled={index <= 0}
                onClick={() => onMoveUpDown(node, -1)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === -1 || index >= siblings.length - 1}
                onClick={() => onMoveUpDown(node, 1)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronDown size={13} />
              </button>
              <button type="button" aria-label="Duplicate" onClick={() => onDuplicate(node.id)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
                <Copy size={13} />
              </button>
              {definition.deletable && (
                <button type="button" aria-label="Delete" onClick={() => onDelete(node.id)} className="rounded p-0.5 text-rose-500 hover:bg-rose-50">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
        {hasChildren && !isCollapsed && children.map((child) => renderRow(child, depth + 1))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 p-3">{renderRow(root, 0)}</CardContent>
    </Card>
  );
}
