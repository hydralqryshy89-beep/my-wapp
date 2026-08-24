import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneStyles: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-xl font-bold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
