"use client";

import type { ReactNode } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { getComponentDefinition } from "@/lib/saas/page-builder/component-registry";
import type { FlatPageNode } from "@/lib/saas/page-builder/build-tree";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { cn } from "@/lib/utils";

function nodePreview(node: FlatPageNode): string {
  const props = (node.props ?? {}) as Record<string, unknown>;
  if (typeof props.text === "string" && props.text) return `"${props.text.slice(0, 30)}"`;
  if (typeof props.src === "string" && props.src) return props.src.slice(0, 30);
  return "";
}

/**
 * The tree view of a Page's nodes — hierarchy, selection, type, and a short
 * content preview, never a pixel-accurate render. Real rendering is
 * PageRenderer's job (see page-renderer.tsx); this stays a structural
 * editing surface on purpose.
 */
export function PageCanvas({
  nodes,
  root,
  selectedId,
  onSelect,
  onDelete,
  onMoveUpDown,
  onMoveToParent,
  containerNodes,
  canEdit,
}: {
  nodes: FlatPageNode[];
  root: FlatPageNode;
  selectedId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUpDown: (node: FlatPageNode, direction: -1 | 1) => void;
  onMoveToParent: (node: FlatPageNode, newParentId: string) => void;
  containerNodes: FlatPageNode[];
  canEdit: boolean;
}) {
  function childrenOf(parentId: string): FlatPageNode[] {
    return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.position - b.position);
  }

  function renderRow(node: FlatPageNode, depth: number): ReactNode {
    const definition = getComponentDefinition(node.type);
    const siblings = node.parentId ? childrenOf(node.parentId) : [node];
    const index = siblings.findIndex((n) => n.id === node.id);
    const isSelected = node.id === selectedId;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm",
            isSelected ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-slate-50"
          )}
          style={{ marginLeft: depth * 16 }}
        >
          <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left">
            <span className="font-medium text-slate-900">{definition.label}</span>
            {nodePreview(node) && <span className="ml-2 truncate text-slate-400">{nodePreview(node)}</span>}
          </button>

          {canEdit && node.parentId !== null && (
            <>
              <button
                type="button"
                aria-label="Move up"
                disabled={index <= 0}
                onClick={() => onMoveUpDown(node, -1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === -1 || index >= siblings.length - 1}
                onClick={() => onMoveUpDown(node, 1)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
              {containerNodes.length > 1 && (
                <select
                  aria-label="Move to parent"
                  className="rounded border border-slate-200 text-xs"
                  value={node.parentId}
                  onChange={(e) => onMoveToParent(node, e.target.value)}
                >
                  {containerNodes
                    .filter((c) => c.id !== node.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {getComponentDefinition(c.type).label} · {c.id.slice(-4)}
                      </option>
                    ))}
                </select>
              )}
              {definition.deletable && (
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => onDelete(node.id)}
                  className="rounded p-1 text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
        {childrenOf(node.id).map((child) => renderRow(child, depth + 1))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canvas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 p-3">{renderRow(root, 0)}</CardContent>
    </Card>
  );
}
