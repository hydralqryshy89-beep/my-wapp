import { isComponentType } from "@/lib/saas/page-builder/component-registry";

export interface PageNodeLike {
  id: string;
  parentId: string | null;
  type: string;
  position: number;
}

/**
 * Integrity check over a Page's full node set: exactly one Root, no
 * orphaned parents, no circular parent chains, no unknown component types,
 * and no duplicate sibling positions. Used by tests and as a defensive
 * check after tree mutations — never trust that a sequence of individually
 * "valid" writes added up to a valid tree.
 */
export function validatePageTree(nodes: readonly PageNodeLike[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const roots = nodes.filter((n) => n.parentId === null);
  if (roots.length !== 1) {
    throw new Error(`Page tree must have exactly one root node, found ${roots.length}.`);
  }
  if (roots[0].type !== "ROOT") {
    throw new Error("The node with no parent must be of type ROOT.");
  }

  for (const node of nodes) {
    if (!isComponentType(node.type)) {
      throw new Error(`Node ${node.id} has an unknown component type "${node.type}".`);
    }
    if (node.parentId !== null && !byId.has(node.parentId)) {
      throw new Error(`Node ${node.id} references a parent that doesn't exist in this page.`);
    }
  }

  for (const node of nodes) {
    const seen = new Set<string>([node.id]);
    let current = node;
    while (current.parentId !== null) {
      if (seen.has(current.parentId)) {
        throw new Error(`Circular parent chain detected at node ${node.id}.`);
      }
      seen.add(current.parentId);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
  }

  const siblingGroups = new Map<string, number[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    const positions = siblingGroups.get(key) ?? [];
    positions.push(node.position);
    siblingGroups.set(key, positions);
  }
  for (const [parentId, positions] of siblingGroups) {
    if (new Set(positions).size !== positions.length) {
      throw new Error(`Duplicate sibling positions under parent ${parentId}.`);
    }
  }
}

/** True if `candidateAncestorId` is `nodeId` itself or one of its ancestors — used to block moving a node into itself or one of its own descendants. */
export function isNodeOrAncestor(
  nodes: readonly PageNodeLike[],
  nodeId: string,
  candidateAncestorId: string
): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current: PageNodeLike | undefined = byId.get(candidateAncestorId);
  while (current) {
    if (current.id === nodeId) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}
