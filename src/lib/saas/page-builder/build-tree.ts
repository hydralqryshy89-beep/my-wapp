export interface FlatPageNode {
  id: string;
  parentId: string | null;
  type: string;
  props: unknown;
  styles: unknown;
  position: number;
}

export interface PageTreeNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  styles: Record<string, unknown>;
  children: PageTreeNode[];
}

/** Turns the flat, position-ordered node list every service/query returns into the nested shape the Editor's canvas and the Renderer both need — built fresh every time, never cached as its own source of truth. */
export function buildNodeTree(nodes: readonly FlatPageNode[]): PageTreeNode {
  const byParent = new Map<string, FlatPageNode[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.position - b.position);

  const root = nodes.find((n) => n.parentId === null);
  if (!root) throw new Error("This page has no root node.");

  function build(node: FlatPageNode): PageTreeNode {
    return {
      id: node.id,
      type: node.type,
      props: (node.props ?? {}) as Record<string, unknown>,
      styles: (node.styles ?? {}) as Record<string, unknown>,
      children: (byParent.get(node.id) ?? []).map(build),
    };
  }

  return build(root);
}
