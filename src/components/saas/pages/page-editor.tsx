"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { getComponentDefinition, type ComponentType } from "@/lib/saas/page-builder/component-registry";
import { buildNodeTree, type FlatPageNode } from "@/lib/saas/page-builder/build-tree";
import {
  createPageNodeAction,
  deletePageNodeAction,
  movePageNodeAction,
  reorderPageNodesAction,
  updatePageNodeAction,
} from "@/actions/saas/page-node.actions";
import { Alert } from "@/components/saas/ui/alert";
import { PagePalette } from "@/components/saas/pages/page-palette";
import { PageCanvas } from "@/components/saas/pages/page-canvas";
import { PagePropertiesPanel } from "@/components/saas/pages/page-properties-panel";
import { PageRenderer } from "@/components/saas/pages/page-renderer";
import { cn } from "@/lib/utils";

/**
 * The orchestrator tying the Palette, Canvas, and Properties Panel together.
 * It never renders a component itself — every structural or property change
 * goes through a Server Action against the stored Page Schema, then the
 * router refresh re-fetches that schema as the new source of truth (no
 * client-side node state is kept beyond the `nodes` prop).
 */
export function PageEditor({
  projectId,
  pageId,
  nodes,
  canEdit,
}: {
  projectId: string;
  pageId: string;
  nodes: FlatPageNode[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const root = nodes.find((n) => n.parentId === null);
  if (!root) throw new Error("This page has no root node.");
  const rootId = root.id;

  const [selectedId, setSelectedId] = useState(rootId);
  const [view, setView] = useState<"editor" | "preview">("editor");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = byId.get(selectedId) ?? root;
  const tree = useMemo(() => buildNodeTree(nodes), [nodes]);
  const containerNodes = useMemo(() => nodes.filter((n) => getComponentDefinition(n.type).canHaveChildren), [nodes]);

  async function run(fn: () => Promise<string | undefined>) {
    setPending(true);
    setError(undefined);
    const message = await fn();
    setPending(false);
    if (message) setError(message);
    else router.refresh();
  }

  function insertionParentId(): string {
    const definition = getComponentDefinition(selected.type);
    if (definition.canHaveChildren) return selected.id;
    return selected.parentId ?? rootId;
  }

  function handleAdd(type: ComponentType) {
    void run(() => createPageNodeAction(projectId, pageId, { parentId: insertionParentId(), type }));
  }

  function handleDelete(nodeId: string) {
    if (nodeId === selectedId) setSelectedId(rootId);
    void run(() => deletePageNodeAction(projectId, pageId, nodeId));
  }

  function handleMoveUpDown(node: FlatPageNode, direction: -1 | 1) {
    const siblings = nodes.filter((n) => n.parentId === node.parentId).sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((n) => n.id === node.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length || !node.parentId) return;
    const order = siblings.map((n) => n.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    void run(() => reorderPageNodesAction(projectId, pageId, node.parentId as string, order));
  }

  function handleMoveToParent(node: FlatPageNode, newParentId: string) {
    void run(() => movePageNodeAction(projectId, pageId, node.id, newParentId));
  }

  function handleSaveProperties(props: Record<string, unknown>, styles: Record<string, unknown>) {
    void run(() => updatePageNodeAction(projectId, pageId, selected.id, { props, styles }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView("editor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "editor" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
            )}
          >
            <Pencil size={14} /> Editor
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "preview" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
            )}
          >
            <Eye size={14} /> Preview
          </button>
        </div>
        {pending && <span className="text-xs text-slate-400">Saving...</span>}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {view === "preview" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <PageRenderer node={tree} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_300px]">
          <PagePalette canEdit={canEdit} onAdd={handleAdd} />
          <PageCanvas
            nodes={nodes}
            root={root}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={handleDelete}
            onMoveUpDown={handleMoveUpDown}
            onMoveToParent={handleMoveToParent}
            containerNodes={containerNodes}
            canEdit={canEdit}
          />
          <PagePropertiesPanel key={selected.id} node={selected} canEdit={canEdit} onSave={handleSaveProperties} />
        </div>
      )}
    </div>
  );
}
