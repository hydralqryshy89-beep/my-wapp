import { z } from "zod";
import { COMPONENT_TYPES } from "@/lib/saas/page-builder/component-registry";

export const pageNameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(80);

export const pageCreateSchema = z.object({ name: pageNameSchema });
export const pageUpdateSchema = z.object({ name: pageNameSchema });

export const pageNodeCreateSchema = z.object({
  parentId: z.string().min(1, "Choose where to add this component."),
  type: z.enum(COMPONENT_TYPES),
});

// `props`/`styles`/`settings` are shape-checked here only as plain objects —
// their real per-component-type validation happens in page-node.service.ts
// against the Component Registry, which this schema has no knowledge of.
export const pageNodeUpdateSchema = z.object({
  props: z.record(z.string(), z.unknown()).optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  expectedUpdatedAt: z.string().optional(),
});

export const pageNodeMoveSchema = z.object({
  newParentId: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export const pageNodeReorderSchema = z.object({
  parentId: z.string().min(1),
  orderedNodeIds: z.array(z.string().min(1)).min(1),
});

// The client captures this shape (from its own local node tree) right
// before deleting a subtree, so Undo can hand it back verbatim — every
// node in it is still revalidated against the Component Registry
// server-side (see restorePageNodeSubtree), this schema only checks shape.
export const restoreNodeInputSchema: z.ZodType<{
  type: string;
  props: Record<string, unknown>;
  styles: Record<string, unknown>;
  settings: Record<string, unknown>;
  children: unknown[];
}> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()),
    styles: z.record(z.string(), z.unknown()),
    settings: z.record(z.string(), z.unknown()),
    children: z.array(restoreNodeInputSchema),
  })
);

export const pageNodeRestoreSchema = z.object({
  parentId: z.string().min(1),
  subtree: restoreNodeInputSchema,
  position: z.number().int().min(0).optional(),
});
