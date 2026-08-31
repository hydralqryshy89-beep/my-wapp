import { ShieldOff } from "lucide-react";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <ShieldOff size={22} />
      </div>
      <div>
        <p className="font-semibold text-slate-900">Access denied</p>
        <p className="mt-1 max-w-md px-4 text-sm text-slate-500">
          {message ?? "You don't have permission to view this."}
        </p>
      </div>
    </div>
  );
}
