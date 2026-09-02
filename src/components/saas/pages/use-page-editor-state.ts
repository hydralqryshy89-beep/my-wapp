"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPageNodeAction,
  deletePageNodeAction,
  duplicatePageNodeAction,
  movePageNodeAction,
  reorderPageNodesAction,
  restorePageNodeSubtreeAction,
  updatePageNodeAction,
  type SerializedNode,
} from "@/actions/saas/page-node.actions";
import { getComponentDefinition, type ComponentType } from "@/lib/saas/page-builder/component-registry";
import {
  findNode,
  getDescendantIds,
  insertNode,
  moveNodeLocal,
  removeSubtree,
  reorderSiblingsLocal,
  siblingsOf,
  updateNodeLocal,
  type EditorNode,
} from "@/lib/saas/page-builder/local-tree-ops";
import type { PageNodeRow, RestoreNodeInput } from "@/services/saas/page-node.service";

export type Device = "desktop" | "tablet" | "mobile";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

function toEditorNode(row: {
  id: string;
  parentId: string | null;
  type: string;
  props: unknown;
  styles: unknown;
  settings: unknown;
  position: number;
  updatedAt: string | Date;
}): EditorNode {
  return {
    id: row.id,
    parentId: row.parentId,
    type: row.type,
    props: (row.props ?? {}) as Record<string, unknown>,
    styles: (row.styles ?? {}) as Record<string, unknown>,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    position: row.position,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/** Inserts a whole server-created subtree (root first, then descendants in the same order the server built them) — every row already carries its real id and its final position, so each is simply spliced in with `insertNode`, which shifts pre-existing siblings out of the way only where they actually exist (the new descendants' parents are brand new, so that shift is a no-op for them). */
function insertSubtreeRows(nodes: EditorNode[], rows: SerializedNode[]): EditorNode[] {
  let result = nodes;
  for (const row of rows) {
    result = insertNode(result, toEditorNode(row));
  }
  return result;
}

/** What the Editor sends back to the server to recreate a deleted subtree verbatim (see restorePageNodeSubtreeAction) — captured from the already-loaded local tree, not re-fetched. */
function captureLocalSubtree(nodes: readonly EditorNode[], nodeId: string): RestoreNodeInput {
  const node = findNode(nodes, nodeId);
  if (!node) throw new Error("Component not found in the local tree.");
  const children = siblingsOf(nodes, nodeId);
  return {
    type: node.type,
    props: node.props,
    styles: node.styles,
    settings: node.settings,
    children: children.map((c) => captureLocalSubtree(nodes, c.id)),
  };
}

interface HistoryCommand {
  label: string;
  redo: () => Promise<string | undefined>;
  undo: () => Promise<string | undefined>;
}

const AUTOSAVE_DELAY_MS = 900;

export function usePageEditorState(projectId: string, pageId: string, initialNodes: PageNodeRow[], canEdit: boolean) {
  const [nodes, setNodes] = useState<EditorNode[]>(() => initialNodes.map(toEditorNode));
  const root = nodes.find((n) => n.parentId === null);
  const rootId = root?.id ?? "";

  const [selectedId, setSelectedId] = useState<string | null>(rootId || null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [past, setPast] = useState<HistoryCommand[]>([]);
  const [future, setFuture] = useState<HistoryCommand[]>([]);
  const [dirty, setDirty] = useState(false);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const pendingEditRef = useRef<{
    nodeId: string;
    kind: "props" | "styles";
    before: Record<string, unknown>;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const flushPendingEdit = useCallback(async () => {
    const pending = pendingEditRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingEditRef.current = null;

    const node = findNode(nodesRef.current, pending.nodeId);
    if (!node) return;
    const after = pending.kind === "props" ? node.props : node.styles;
    if (JSON.stringify(after) === JSON.stringify(pending.before)) return; // nothing actually changed

    setStatus("saving");
    const body = pending.kind === "props" ? { props: after } : { styles: after };
    const result = await updatePageNodeAction(projectId, pageId, pending.nodeId, body);
    if (result.error) {
      setNodes((prev) => updateNodeLocal(prev, pending.nodeId, pending.kind === "props" ? { props: pending.before } : { styles: pending.before }));
      setStatus("error");
      setErrorMessage(result.error);
      setDirty(false);
      return;
    }
    if (result.updatedAt) {
      setNodes((prev) => updateNodeLocal(prev, pending.nodeId, { updatedAt: result.updatedAt }));
    }
    const before = pending.before;
    const kind = pending.kind;
    const nodeId = pending.nodeId;
    setPast((p) => [
      ...p,
      {
        label: kind === "props" ? "Edit properties" : "Edit styles",
        redo: async () => {
          setNodes((prev) => updateNodeLocal(prev, nodeId, kind === "props" ? { props: after } : { styles: after }));
          const r = await updatePageNodeAction(projectId, pageId, nodeId, kind === "props" ? { props: after } : { styles: after });
          if (!r.error && r.updatedAt) setNodes((prev) => updateNodeLocal(prev, nodeId, { updatedAt: r.updatedAt }));
          return r.error;
        },
        undo: async () => {
          setNodes((prev) => updateNodeLocal(prev, nodeId, kind === "props" ? { props: before } : { styles: before }));
          const r = await updatePageNodeAction(projectId, pageId, nodeId, kind === "props" ? { props: before } : { styles: before });
          if (!r.error && r.updatedAt) setNodes((prev) => updateNodeLocal(prev, nodeId, { updatedAt: r.updatedAt }));
          return r.error;
        },
      },
    ]);
    setFuture([]);
    setStatus("saved");
    setDirty(false);
  }, [pageId, projectId]);

  const scheduleEdit = useCallback(
    (nodeId: string, kind: "props" | "styles", nextValue: Record<string, unknown>) => {
      const pending = pendingEditRef.current;
      if (pending && (pending.nodeId !== nodeId || pending.kind !== kind)) {
        void flushPendingEdit();
      }
      if (!pendingEditRef.current || pendingEditRef.current.nodeId !== nodeId || pendingEditRef.current.kind !== kind) {
        const node = findNode(nodesRef.current, nodeId);
        const before = (kind === "props" ? node?.props : node?.styles) ?? {};
        pendingEditRef.current = {
          nodeId,
          kind,
          before,
          timer: setTimeout(() => void flushPendingEdit(), AUTOSAVE_DELAY_MS),
        };
      } else {
        clearTimeout(pendingEditRef.current.timer);
        pendingEditRef.current.timer = setTimeout(() => void flushPendingEdit(), AUTOSAVE_DELAY_MS);
      }
      setNodes((prev) => updateNodeLocal(prev, nodeId, kind === "props" ? { props: nextValue } : { styles: nextValue }));
      setDirty(true);
    },
    [flushPendingEdit]
  );

  const updateProps = useCallback((nodeId: string, nextProps: Record<string, unknown>) => scheduleEdit(nodeId, "props", nextProps), [scheduleEdit]);
  const updateStyles = useCallback((nodeId: string, nextStyles: Record<string, unknown>) => scheduleEdit(nodeId, "styles", nextStyles), [scheduleEdit]);

  const runCommand = useCallback(async (command: HistoryCommand) => {
    setStatus("saving");
    setErrorMessage(undefined);
    const error = await command.redo();
    if (error) {
      setStatus("error");
      setErrorMessage(error);
      return;
    }
    setPast((p) => [...p, command]);
    setFuture([]);
    setStatus("saved");
  }, []);

  const addNode = useCallback(
    async (parentId: string, type: ComponentType) => {
      if (!canEdit) return;
      await flushPendingEdit();
      const definition = getComponentDefinition(type);
      const position = siblingsOf(nodesRef.current, parentId).length;
      setStatus("saving");
      const result = await createPageNodeAction(projectId, pageId, { parentId, type });
      if (result.error || !result.nodeId) {
        setStatus("error");
        setErrorMessage(result.error ?? "Could not add the component.");
        return;
      }
      const idRef = { current: result.nodeId };
      const newNode: EditorNode = {
        id: idRef.current,
        parentId,
        type,
        props: { ...definition.defaultProps },
        styles: { ...definition.defaultStyles },
        settings: {},
        position,
        updatedAt: result.updatedAt ?? new Date().toISOString(),
      };
      setNodes((prev) => insertNode(prev, newNode));
      setSelectedId(idRef.current);
      setStatus("saved");

      setPast((p) => [
        ...p,
        {
          label: `Add ${definition.label}`,
          redo: async () => {
            const r = await createPageNodeAction(projectId, pageId, { parentId, type });
            if (r.error || !r.nodeId) return r.error ?? "Could not add the component.";
            idRef.current = r.nodeId;
            const recreated: EditorNode = { ...newNode, id: r.nodeId, updatedAt: r.updatedAt ?? new Date().toISOString() };
            setNodes((prev) => insertNode(prev, recreated));
            setSelectedId(r.nodeId);
            return undefined;
          },
          undo: async () => {
            const r = await deletePageNodeAction(projectId, pageId, idRef.current);
            if (r.error) return r.error;
            setNodes((prev) => removeSubtree(prev, idRef.current).remaining);
            setSelectedId(parentId);
            return undefined;
          },
        },
      ]);
      setFuture([]);
    },
    [canEdit, flushPendingEdit, pageId, projectId]
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      if (!canEdit) return;
      const node = findNode(nodesRef.current, nodeId);
      if (!node || node.parentId === null) return;
      await flushPendingEdit();

      const snapshot = captureLocalSubtree(nodesRef.current, nodeId);
      const parentId = node.parentId;
      const originalPosition = node.position;
      const definition = getComponentDefinition(node.type);
      const idRef = { current: nodeId };

      const { remaining } = removeSubtree(nodesRef.current, nodeId);
      setNodes(remaining);
      if (selectedId === nodeId || (selectedId && getDescendantIds(nodesRef.current, nodeId).has(selectedId))) {
        setSelectedId(parentId);
      }
      setStatus("saving");
      const result = await deletePageNodeAction(projectId, pageId, nodeId);
      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }
      setStatus("saved");

      setPast((p) => [
        ...p,
        {
          label: `Delete ${definition.label}`,
          redo: async () => {
            const r = await deletePageNodeAction(projectId, pageId, idRef.current);
            if (r.error) return r.error;
            setNodes((prev) => removeSubtree(prev, idRef.current).remaining);
            return undefined;
          },
          undo: async () => {
            const r = await restorePageNodeSubtreeAction(projectId, pageId, parentId, snapshot, originalPosition);
            if (r.error || !r.nodes || !r.rootId) return r.error ?? "Could not restore the component.";
            idRef.current = r.rootId;
            setNodes((prev) => insertSubtreeRows(prev, r.nodes as SerializedNode[]));
            setSelectedId(r.rootId);
            return undefined;
          },
        },
      ]);
      setFuture([]);
    },
    [canEdit, flushPendingEdit, pageId, projectId, selectedId]
  );

  const duplicateNode = useCallback(
    async (nodeId: string) => {
      if (!canEdit) return;
      const node = findNode(nodesRef.current, nodeId);
      if (!node || node.parentId === null) return;
      await flushPendingEdit();

      setStatus("saving");
      const result = await duplicatePageNodeAction(projectId, pageId, nodeId);
      if (result.error || !result.nodes || !result.rootId) {
        setStatus("error");
        setErrorMessage(result.error ?? "Could not duplicate the component.");
        return;
      }
      const idRef = { current: result.rootId };
      setNodes((prev) => insertSubtreeRows(prev, result.nodes as SerializedNode[]));
      setSelectedId(idRef.current);
      setStatus("saved");

      setPast((p) => [
        ...p,
        {
          label: "Duplicate component",
          redo: async () => {
            const r = await duplicatePageNodeAction(projectId, pageId, nodeId);
            if (r.error || !r.nodes || !r.rootId) return r.error ?? "Could not duplicate the component.";
            idRef.current = r.rootId;
            setNodes((prev) => insertSubtreeRows(prev, r.nodes as SerializedNode[]));
            setSelectedId(r.rootId);
            return undefined;
          },
          undo: async () => {
            const r = await deletePageNodeAction(projectId, pageId, idRef.current);
            if (r.error) return r.error;
            setNodes((prev) => removeSubtree(prev, idRef.current).remaining);
            setSelectedId(nodeId);
            return undefined;
          },
        },
      ]);
      setFuture([]);
    },
    [canEdit, flushPendingEdit, pageId, projectId]
  );

  const moveNode = useCallback(
    async (nodeId: string, newParentId: string, position: number) => {
      if (!canEdit) return;
      const node = findNode(nodesRef.current, nodeId);
      if (!node || node.parentId === null) return;
      await flushPendingEdit();
      const oldParentId = node.parentId;
      const oldPosition = node.position;

      setNodes((prev) => moveNodeLocal(prev, nodeId, newParentId, position));
      await runCommand({
        label: "Move component",
        redo: async () => {
          setNodes((prev) => moveNodeLocal(prev, nodeId, newParentId, position));
          const r = await movePageNodeAction(projectId, pageId, nodeId, newParentId, position);
          return r.error;
        },
        undo: async () => {
          setNodes((prev) => moveNodeLocal(prev, nodeId, oldParentId, oldPosition));
          const r = await movePageNodeAction(projectId, pageId, nodeId, oldParentId, oldPosition);
          return r.error;
        },
      });
    },
    [canEdit, flushPendingEdit, pageId, projectId, runCommand]
  );

  const reorderSiblings = useCallback(
    async (parentId: string, orderedIds: string[]) => {
      if (!canEdit) return;
      await flushPendingEdit();
      const previousOrder = siblingsOf(nodesRef.current, parentId).map((n) => n.id);

      setNodes((prev) => reorderSiblingsLocal(prev, parentId, orderedIds));
      await runCommand({
        label: "Reorder components",
        redo: async () => {
          setNodes((prev) => reorderSiblingsLocal(prev, parentId, orderedIds));
          const r = await reorderPageNodesAction(projectId, pageId, parentId, orderedIds);
          return r.error;
        },
        undo: async () => {
          setNodes((prev) => reorderSiblingsLocal(prev, parentId, previousOrder));
          const r = await reorderPageNodesAction(projectId, pageId, parentId, previousOrder);
          return r.error;
        },
      });
    },
    [canEdit, flushPendingEdit, pageId, projectId, runCommand]
  );

  const undo = useCallback(async () => {
    await flushPendingEdit();
    let command: HistoryCommand | undefined;
    setPast((p) => {
      if (p.length === 0) return p;
      command = p[p.length - 1];
      return p.slice(0, -1);
    });
    if (!command) return;
    setStatus("saving");
    const error = await command.undo();
    if (error) {
      setStatus("error");
      setErrorMessage(error);
      setPast((p) => [...p, command as HistoryCommand]);
      return;
    }
    setFuture((f) => [...f, command as HistoryCommand]);
    setStatus("saved");
  }, [flushPendingEdit]);

  const redo = useCallback(async () => {
    await flushPendingEdit();
    let command: HistoryCommand | undefined;
    setFuture((f) => {
      if (f.length === 0) return f;
      command = f[f.length - 1];
      return f.slice(0, -1);
    });
    if (!command) return;
    setStatus("saving");
    const error = await command.redo();
    if (error) {
      setStatus("error");
      setErrorMessage(error);
      setFuture((f) => [...f, command as HistoryCommand]);
      return;
    }
    setPast((p) => [...p, command as HistoryCommand]);
    setStatus("saved");
  }, [flushPendingEdit]);

  // Keyboard shortcuts — ignored while the user is typing in a text control.
  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (isTyping(e.target)) return;

      if (meta && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        void redo();
      } else if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        void deleteNode(selectedId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, undo, redo, deleteNode]);

  useEffect(() => {
    return () => {
      if (pendingEditRef.current) clearTimeout(pendingEditRef.current.timer);
    };
  }, []);

  // Warn before leaving the tab while a debounced edit hasn't been flushed yet.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selected = useMemo(() => (selectedId ? findNode(nodes, selectedId) : undefined), [nodes, selectedId]);

  return {
    nodes,
    root,
    rootId,
    selectedId,
    selected,
    hoveredId,
    device,
    status,
    errorMessage,
    dirty,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    setSelectedId,
    setHoveredId,
    setDevice,
    addNode,
    deleteNode,
    duplicateNode,
    moveNode,
    reorderSiblings,
    updateProps,
    updateStyles,
    flushPendingEdit,
    undo,
    redo,
  };
}
