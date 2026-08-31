import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/saas/ui/card";

export function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </Card>
  );
}
