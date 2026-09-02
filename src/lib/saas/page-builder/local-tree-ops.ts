/**
 * Pure, framework-agnostic operations over the Editor's local mirror of a
 * Page's flat node list. Nothing here talks to the server or React — the
 * Editor's state hook calls these to compute the *next* local array, then
 * separately calls the matching Server Action to persist it. Kept pure so
 * the Undo/Redo stack can call the same functions forwards and backwards
 * without re-deriving anything from the DOM or from React state.
 */

export interface EditorNode {
  id: string;
  parentId: string | null;
  type: string;
  props: Record<string, unknown>;
  styles: Record<string, unknown>;
  settings: Record<string, unknown>;
  position: number;
  updatedAt: string;
}

export function findNode(nodes: readonly EditorNode[], id: string): EditorNode | undefined {
  return nodes.find((n) => n.id === id);
}

export function siblingsOf(nodes: readonly EditorNode[], parentId: string | null): EditorNode[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.position - b.position);
}

export function childrenOf(nodes: readonly EditorNode[], parentId: string): EditorNode[] {
  return siblingsOf(nodes, parentId);
}

/** Every id reachable by walking down from `nodeId` (children, grandchildren, ...) — never includes `nodeId` itself. */
export function getDescendantIds(nodes: readonly EditorNode[], nodeId: string): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentId === null) continue;
    const list = byParent.get(n.parentId) ?? [];
    list.push(n.id);
    byParent.set(n.parentId, list);
  }
  const result = new Set<string>();
  const stack = [...(byParent.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return result;
}

/** Inserts a brand-new node, shifting later siblings under the same parent down by one. */
export function insertNode(nodes: readonly EditorNode[], newNode: EditorNode): EditorNode[] {
  const shifted = nodes.map((n) =>
    n.parentId === newNode.parentId && n.position >= newNode.position ? { ...n, position: n.position + 1 } : n
  );
  return [...shifted, newNode];
}

/** Removes a node and its whole subtree, compacting the positions of its remaining siblings. Returns the removed rows (root first) so the caller can snapshot them for Undo. */
export function removeSubtree(nodes: readonly EditorNode[], nodeId: string): { remaining: EditorNode[]; removed: EditorNode[] } {
  const target = findNode(nodes, nodeId);
  if (!target) return { remaining: [...nodes], removed: [] };
  const descendantIds = getDescendantIds(nodes, nodeId);
  const toRemove = new Set([nodeId, ...descendantIds]);
  const removed = nodes.filter((n) => toRemove.has(n.id));
  const kept = nodes.filter((n) => !toRemove.has(n.id));
  const compacted = kept.map((n) =>
    n.parentId === target.parentId && n.position > target.position ? { ...n, position: n.position - 1 } : n
  );
  return { remaining: compacted, removed };
}

/** Moves an existing node to a (possibly different) parent at a specific sibling index, compacting the old siblings and making room in the new ones. */
export function moveNodeLocal(nodes: readonly EditorNode[], nodeId: string, newParentId: string, position: number): EditorNode[] {
  const node = findNode(nodes, nodeId);
  if (!node) return [...nodes];
  const oldParentId = node.parentId;

  let result = nodes.map((n) => {
    if (n.id === nodeId) return n;
    if (n.parentId === oldParentId && n.position > node.position) return { ...n, position: n.position - 1 };
    return n;
  });
  result = result.map((n) => {
    if (n.id === nodeId) return n;
    if (n.parentId === newParentId && n.position >= position) return { ...n, position: n.position + 1 };
    return n;
  });
  return result.map((n) => (n.id === nodeId ? { ...n, parentId: newParentId, position } : n));
}

/** Rewrites sibling positions under one parent to match `orderedIds` exactly. */
export function reorderSiblingsLocal(nodes: readonly EditorNode[], parentId: string | null, orderedIds: readonly string[]): EditorNode[] {
  const positionById = new Map(orderedIds.map((id, index) => [id, index]));
  return nodes.map((n) => (n.parentId === parentId && positionById.has(n.id) ? { ...n, position: positionById.get(n.id) as number } : n));
}

export function updateNodeLocal(
  nodes: readonly EditorNode[],
  nodeId: string,
  patch: Partial<Pick<EditorNode, "props" | "styles" | "settings" | "updatedAt">>
): EditorNode[] {
  return nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n));
}

/** Renumbers a node's id (and its descendants' parentId references) in place — used after a server round-trip hands back the real, persisted ids for a create/duplicate/restore. */
export function rekeyNode(nodes: readonly EditorNode[], oldId: string, newId: string): EditorNode[] {
  return nodes.map((n) => {
    if (n.id === oldId) return { ...n, id: newId };
    if (n.parentId === oldId) return { ...n, parentId: newId };
    return n;
  });
}
