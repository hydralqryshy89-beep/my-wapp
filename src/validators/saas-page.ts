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
});

export const pageNodeMoveSchema = z.object({
  newParentId: z.string().min(1),
});
