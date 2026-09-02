"use client";

import { Undo2, Redo2, Eye, Pencil, Monitor, Tablet, Smartphone, Settings } from "lucide-react";
import type { Device, SaveStatus } from "@/components/saas/pages/use-page-editor-state";
import { Button } from "@/components/saas/ui/button";
import { cn } from "@/lib/utils";

const iconButtonBase = "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent";

export function PageToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  status,
  dirty,
  onSaveNow,
  view,
  onViewChange,
  device,
  onDeviceChange,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  status: SaveStatus;
  dirty: boolean;
  onSaveNow: () => void;
  view: "editor" | "preview";
  onViewChange: (view: "editor" | "preview") => void;
  device: Device;
  onDeviceChange: (device: Device) => void;
}) {
  const statusLabel = status === "saving" ? "Saving..." : dirty ? "Unsaved changes" : status === "error" ? "Save failed" : "Saved";

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" className={iconButtonBase}>
          <Undo2 size={16} />
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={iconButtonBase}>
          <Redo2 size={16} />
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button type="button" size="sm" variant="outline" onClick={onSaveNow}>
          Save
        </Button>
        <span
          className={cn(
            "ml-1 text-xs",
            status === "error" ? "text-rose-600" : dirty || status === "saving" ? "text-amber-600" : "text-slate-400"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
        <button
          type="button"
          onClick={() => onViewChange("editor")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
            view === "editor" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
          )}
        >
          <Pencil size={14} /> Editor
        </button>
        <button
          type="button"
          onClick={() => onViewChange("preview")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
            view === "preview" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
          )}
        >
          <Eye size={14} /> Preview
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
        <button
          type="button"
          aria-label="Desktop preview"
          onClick={() => onDeviceChange("desktop")}
          className={cn("flex h-7 w-7 items-center justify-center rounded-md", device === "desktop" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
        >
          <Monitor size={14} />
        </button>
        <button
          type="button"
          aria-label="Tablet preview"
          onClick={() => onDeviceChange("tablet")}
          className={cn("flex h-7 w-7 items-center justify-center rounded-md", device === "tablet" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
        >
          <Tablet size={14} />
        </button>
        <button
          type="button"
          aria-label="Mobile preview"
          onClick={() => onDeviceChange("mobile")}
          className={cn("flex h-7 w-7 items-center justify-center rounded-md", device === "mobile" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
        >
          <Smartphone size={14} />
        </button>
      </div>

      <a href="#page-settings" aria-label="Page settings" title="Page settings" className={iconButtonBase}>
        <Settings size={16} />
      </a>
    </div>
  );
}
