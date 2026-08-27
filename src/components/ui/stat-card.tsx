import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// A fixed-order categorical palette (identity, not magnitude) — one distinct
// jewel tone per KPI slot so the eye can tell tiles apart at a glance, same
// idea as a chart's categorical series color, just applied to stat tiles.
const TONE_STYLES = {
  burgundy: "bg-[#6e1b2e] text-white",
  navy: "bg-[#16233f] text-white",
  emerald: "bg-[#0f4a3a] text-white",
  gold: "bg-[#6b5217] text-white",
  indigo: "bg-[#2e2361] text-white",
  teal: "bg-[#0e4a52] text-white",
  plum: "bg-[#4a1d52] text-white",
  slate: "bg-[#33404d] text-white",
} as const;

export type StatTone = keyof typeof TONE_STYLES;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className={cn("rounded-xl p-4 shadow-sm", TONE_STYLES[tone])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/70">{label}</p>
          <p className="mt-1.5 text-xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-white/60">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
