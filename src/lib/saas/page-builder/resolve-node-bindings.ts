import { getComponentDefinition, isComponentType } from "@/lib/saas/page-builder/component-registry";
import { normalizeBindingValue, resolveBindingValue, type BindingContext } from "@/lib/saas/page-builder/binding-schema";
import type { PageTreeNode } from "@/lib/saas/page-builder/build-tree";

/**
 * Walks a rendered node tree and replaces every bindable prop's raw stored
 * value (string or BindingDefinition) with its resolved plain string — the
 * only integration point between Data Binding and rendering. PageRenderer
 * itself never sees a BindingDefinition; it only ever gets plain props,
 * exactly like Phase 3A/3B.
 */
export function resolveNodeTree(node: PageTreeNode, context: BindingContext): PageTreeNode {
  const children = node.children.map((child) => resolveNodeTree(child, context));
  if (!isComponentType(node.type)) return { ...node, children };

  const definition = getComponentDefinition(node.type);
  const props: Record<string, unknown> = { ...node.props };
  for (const field of definition.propertyFields) {
    if (!field.binding) continue;
    if (!(field.key in node.props)) continue;
    const binding = normalizeBindingValue(node.props[field.key]);
    props[field.key] = resolveBindingValue(field.binding, binding, context).value;
  }
  return { ...node, props, children };
}

/** Every distinct modelId any node on the page currently references through a Dynamic binding — the exact (and only) set of models the Editor/Preview ever needs to fetch a preview record for. */
export function collectBoundModelIds(nodes: readonly { type: string; props: Record<string, unknown> }[]): Set<string> {
  const modelIds = new Set<string>();
  for (const node of nodes) {
    if (!isComponentType(node.type)) continue;
    const definition = getComponentDefinition(node.type);
    for (const field of definition.propertyFields) {
      if (!field.binding) continue;
      const binding = normalizeBindingValue(node.props[field.key]);
      if (binding.mode === "binding" && binding.modelId) modelIds.add(binding.modelId);
    }
  }
  return modelIds;
}
