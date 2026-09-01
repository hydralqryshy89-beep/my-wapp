"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "fields", label: "Fields" },
  { key: "relations", label: "Relations" },
  { key: "settings", label: "Settings" },
] as const;

export function ModelEditorTabs({
  fieldsContent,
  relationsContent,
  settingsContent,
}: {
  fieldsContent: React.ReactNode;
  relationsContent: React.ReactNode;
  settingsContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("fields");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "fields" && fieldsContent}
      {tab === "relations" && relationsContent}
      {tab === "settings" && settingsContent}
    </div>
  );
}
