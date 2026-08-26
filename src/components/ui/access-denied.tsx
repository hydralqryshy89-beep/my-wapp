import { ShieldOff } from "lucide-react";

export function AccessDenied({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <ShieldOff size={22} />
      </div>
      <div>
        <p className="font-semibold text-foreground">لا تملك صلاحية الوصول لـ«{label}»</p>
        <p className="mt-1 text-sm text-muted">تواصل مع مدير النظام إذا تحتاج صلاحية لهذا القسم.</p>
      </div>
    </div>
  );
}
