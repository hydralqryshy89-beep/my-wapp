import { LogOut } from "lucide-react";
import { logout } from "@/actions/saas/auth.actions";
import type { CurrentSaasUser } from "@/types/saas";

export function Topbar({ user }: { user: CurrentSaasUser }) {
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-semibold text-slate-900">{user.name}</div>
        <div className="text-xs text-slate-500">{user.email}</div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </form>
    </header>
  );
}
