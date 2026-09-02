import type { ComponentType } from "@/lib/saas/page-builder/component-registry";

export type Zone = "before" | "inside" | "after";

export interface DropZone {
  targetId: string;
  zone: Zone;
}

export type DragData = { source: "palette"; type: ComponentType } | { source: "node"; nodeId: string; type: string };

/**
 * Turns the dragged item's current on-screen rectangle and the rectangle of
 * whatever it's hovering into one of before/inside/after — a container
 * gets a middle "inside" band, a leaf only ever splits into before/after.
 */
export function computeDropZone(
  draggedRect: { top: number; height: number },
  overRect: { top: number; height: number },
  canHaveChildren: boolean,
  isRoot: boolean
): Zone {
  if (isRoot) return "inside";
  const center = draggedRect.top + draggedRect.height / 2;
  const relative = overRect.height === 0 ? 0.5 : (center - overRect.top) / overRect.height;
  if (!canHaveChildren) return relative < 0.5 ? "before" : "after";
  if (relative < 0.25) return "before";
  if (relative > 0.75) return "after";
  return "inside";
}
