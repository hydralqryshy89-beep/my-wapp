"use client";

import { PALETTE_COMPONENT_TYPES, COMPONENT_REGISTRY, type ComponentType } from "@/lib/saas/page-builder/component-registry";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/saas/ui/card";

/** The Palette lists every non-Root type from the Component Registry — never a hardcoded list of its own. */
export function PagePalette({ canEdit, onAdd }: { canEdit: boolean; onAdd: (type: ComponentType) => void }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Components</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 p-3">
        {PALETTE_COMPONENT_TYPES.map((type) => {
          const definition = COMPONENT_REGISTRY[type];
          return (
            <button
              key={type}
              type="button"
              disabled={!canEdit}
              onClick={() => onAdd(type)}
              className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {definition.label}
            </button>
          );
        })}
        {!canEdit && <p className="mt-1 text-xs text-slate-400">You don&apos;t have permission to edit this page.</p>}
      </CardContent>
    </Card>
  );
}
