"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  PERMISSION_RESOURCES,
  PERMISSION_RESOURCE_LABELS,
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_LABELS,
  type PermissionLevel,
  type PermissionResource,
} from "@/lib/constants";

type RoleAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function RoleForm({
  action,
  submitLabel,
  defaultName = "",
  defaultIsAdmin = false,
  defaultPermissions,
  namePlaceholder,
  dashed,
}: {
  action: RoleAction;
  submitLabel: string;
  defaultName?: string;
  defaultIsAdmin?: boolean;
  defaultPermissions?: Partial<Record<PermissionResource, PermissionLevel>>;
  namePlaceholder?: string;
  dashed?: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className={`flex flex-col gap-3 rounded-lg border p-4 ${dashed ? "border-dashed border-border" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          name="name"
          defaultValue={defaultName}
          required
          placeholder={namePlaceholder}
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" name="isAdmin" defaultChecked={defaultIsAdmin} className="h-4 w-4 rounded border-border" />
          مدير النظام (وصول كامل)
        </label>
        <Button type="submit" size="sm" variant={dashed ? "primary" : "outline"} disabled={pending}>
          {pending ? "..." : submitLabel}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PERMISSION_RESOURCES.map((resource) => (
          <label key={resource} className="flex flex-col gap-1 text-xs">
            <span className="text-muted">{PERMISSION_RESOURCE_LABELS[resource]}</span>
            <select
              name={`perm_${resource}`}
              defaultValue={defaultPermissions?.[resource] ?? "NONE"}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
            >
              {PERMISSION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {PERMISSION_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
