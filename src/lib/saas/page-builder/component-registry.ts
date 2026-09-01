import { z } from "zod";

/**
 * The single source of truth for every component type the Page Builder
 * understands: its default props/styles, its property-panel schema (used to
 * both validate a SaasPageNode's `props` server-side and to generate the
 * Editor's Properties Panel controls), and its structural placement rules
 * (allowedParents / canHaveChildren). Nothing outside this file may
 * hardcode a component type's shape (see AGENTS.md Phase 3A) — services,
 * validators, the Editor, and the Renderer all read from here.
 */

export const COMPONENT_TYPES = [
  "ROOT",
  "CONTAINER",
  "SECTION",
  "STACK",
  "GRID",
  "TEXT",
  "HEADING",
  "IMAGE",
  "BUTTON",
  "SPACER",
  "DIVIDER",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export function isComponentType(value: string): value is ComponentType {
  return (COMPONENT_TYPES as readonly string[]).includes(value);
}

// Whitelisted style properties — anything not in this list is rejected
// rather than silently dropped, so a bad client payload fails loudly.
export const STYLE_PROPERTY_KEYS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "padding",
  "margin",
  "background",
  "border",
  "borderRadius",
  "fontSize",
  "fontWeight",
  "textAlign",
  "color",
  "display",
  "gap",
] as const;
export type StylePropertyKey = (typeof STYLE_PROPERTY_KEYS)[number];

const styleValue = z.string().trim().max(200);
export const styleSchema = z
  .object(Object.fromEntries(STYLE_PROPERTY_KEYS.map((key) => [key, styleValue])) as Record<StylePropertyKey, typeof styleValue>)
  .partial()
  .strict();

export type PropertyControl = "text" | "textarea" | "number" | "select" | "checkbox";

export interface PropertyFieldDef {
  key: string;
  label: string;
  control: PropertyControl;
  options?: readonly string[];
}

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  category: "structure" | "layout" | "content";
  canHaveChildren: boolean;
  /** The Root node is created once per Page and can never be deleted or added a second time from the Palette. */
  isRoot: boolean;
  deletable: boolean;
  defaultProps: Record<string, unknown>;
  defaultStyles: Record<string, unknown>;
  propsSchema: z.ZodTypeAny;
  propertyFields: readonly PropertyFieldDef[];
}

const emptyPropsSchema = z.object({}).strict();

export const COMPONENT_REGISTRY: Record<ComponentType, ComponentDefinition> = {
  ROOT: {
    type: "ROOT",
    label: "Page",
    category: "structure",
    canHaveChildren: true,
    isRoot: true,
    deletable: false,
    defaultProps: {},
    defaultStyles: {},
    propsSchema: emptyPropsSchema,
    propertyFields: [],
  },
  CONTAINER: {
    type: "CONTAINER",
    label: "Container",
    category: "layout",
    canHaveChildren: true,
    isRoot: false,
    deletable: true,
    defaultProps: {},
    defaultStyles: { padding: "16px" },
    propsSchema: emptyPropsSchema,
    propertyFields: [],
  },
  SECTION: {
    type: "SECTION",
    label: "Section",
    category: "layout",
    canHaveChildren: true,
    isRoot: false,
    deletable: true,
    defaultProps: {},
    defaultStyles: { padding: "24px" },
    propsSchema: emptyPropsSchema,
    propertyFields: [],
  },
  STACK: {
    type: "STACK",
    label: "Stack",
    category: "layout",
    canHaveChildren: true,
    isRoot: false,
    deletable: true,
    defaultProps: { direction: "column" },
    defaultStyles: { gap: "12px", display: "flex" },
    propsSchema: z.object({ direction: z.enum(["row", "column"]) }).strict(),
    propertyFields: [{ key: "direction", label: "Direction", control: "select", options: ["row", "column"] }],
  },
  GRID: {
    type: "GRID",
    label: "Grid",
    category: "layout",
    canHaveChildren: true,
    isRoot: false,
    deletable: true,
    defaultProps: { columns: 2 },
    defaultStyles: { gap: "12px" },
    propsSchema: z.object({ columns: z.number().int().min(1).max(12) }).strict(),
    propertyFields: [{ key: "columns", label: "Columns", control: "number" }],
  },
  TEXT: {
    type: "TEXT",
    label: "Text",
    category: "content",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: { text: "Text" },
    defaultStyles: {},
    propsSchema: z.object({ text: z.string().trim().max(2000) }).strict(),
    propertyFields: [{ key: "text", label: "Text", control: "textarea" }],
  },
  HEADING: {
    type: "HEADING",
    label: "Heading",
    category: "content",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: { text: "Heading", level: "2" },
    defaultStyles: {},
    propsSchema: z.object({ text: z.string().trim().max(300), level: z.enum(["1", "2", "3", "4"]) }).strict(),
    propertyFields: [
      { key: "text", label: "Text", control: "textarea" },
      { key: "level", label: "Level", control: "select", options: ["1", "2", "3", "4"] },
    ],
  },
  IMAGE: {
    type: "IMAGE",
    label: "Image",
    category: "content",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: { src: "https://placehold.co/600x400", alt: "Image" },
    defaultStyles: {},
    propsSchema: z.object({ src: z.string().trim().max(2000), alt: z.string().trim().max(300) }).strict(),
    propertyFields: [
      { key: "src", label: "Image URL", control: "text" },
      { key: "alt", label: "Alt text", control: "text" },
    ],
  },
  BUTTON: {
    type: "BUTTON",
    label: "Button",
    category: "content",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: { text: "Button", href: "#" },
    defaultStyles: {},
    propsSchema: z.object({ text: z.string().trim().max(200), href: z.string().trim().max(2000) }).strict(),
    propertyFields: [
      { key: "text", label: "Text", control: "text" },
      { key: "href", label: "Link URL", control: "text" },
    ],
  },
  SPACER: {
    type: "SPACER",
    label: "Spacer",
    category: "layout",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: { height: 24 },
    defaultStyles: {},
    propsSchema: z.object({ height: z.number().int().min(1).max(1000) }).strict(),
    propertyFields: [{ key: "height", label: "Height (px)", control: "number" }],
  },
  DIVIDER: {
    type: "DIVIDER",
    label: "Divider",
    category: "layout",
    canHaveChildren: false,
    isRoot: false,
    deletable: true,
    defaultProps: {},
    defaultStyles: {},
    propsSchema: emptyPropsSchema,
    propertyFields: [],
  },
};

export const PALETTE_COMPONENT_TYPES: readonly ComponentType[] = COMPONENT_TYPES.filter(
  (type) => !COMPONENT_REGISTRY[type].isRoot
);

export function getComponentDefinition(type: string): ComponentDefinition {
  if (!isComponentType(type)) throw new Error(`Unknown component type "${type}".`);
  return COMPONENT_REGISTRY[type];
}

/** A container-capable type may parent any non-Root type; a leaf type may never have children. */
export function canParentType(parentType: ComponentType, childType: ComponentType): boolean {
  if (childType === "ROOT") return false;
  return COMPONENT_REGISTRY[parentType].canHaveChildren;
}
