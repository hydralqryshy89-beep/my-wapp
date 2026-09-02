"use client";

import { useDraggable } from "@dnd-kit/core";
import { PALETTE_COMPONENT_TYPES, COMPONENT_REGISTRY, type ComponentType } from "@/lib/saas/page-builder/component-registry";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";
import { cn } from "@/lib/utils";

function PaletteItem({ type, canEdit, onAdd }: { type: ComponentType; canEdit: boolean; onAdd: (type: ComponentType) => void }) {
  const definition = COMPONENT_REGISTRY[type];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", type },
    disabled: !canEdit,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={!canEdit}
      onClick={() => onAdd(type)}
      aria-label={`Add ${definition.label}`}
      className={cn(
        "cursor-grab rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40",
        isDragging && "opacity-30"
      )}
      {...listeners}
      {...attributes}
    >
      {definition.label}
    </button>
  );
}

/** The Palette lists every non-Root type from the Component Registry — never a hardcoded list of its own. Each item is both draggable (drop it on the Canvas) and clickable (adds it next to the current selection), so the editor never depends on drag-and-drop alone. */
export function PagePalette({ canEdit, onAdd }: { canEdit: boolean; onAdd: (type: ComponentType) => void }) {
  const layout = PALETTE_COMPONENT_TYPES.filter((t) => COMPONENT_REGISTRY[t].category === "layout");
  const content = PALETTE_COMPONENT_TYPES.filter((t) => COMPONENT_REGISTRY[t].category === "content");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Components</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-3">
        <div>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase text-slate-400">Layout</p>
          <div className="flex flex-col gap-1.5">
            {layout.map((type) => (
              <PaletteItem key={type} type={type} canEdit={canEdit} onAdd={onAdd} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase text-slate-400">Content</p>
          <div className="flex flex-col gap-1.5">
            {content.map((type) => (
              <PaletteItem key={type} type={type} canEdit={canEdit} onAdd={onAdd} />
            ))}
          </div>
        </div>
        {!canEdit && <p className="px-1 text-xs text-slate-400">You don&apos;t have permission to edit this page.</p>}
      </CardContent>
    </Card>
  );
}
