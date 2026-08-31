import { Sidebar } from "@/components/saas/layout/sidebar";
import { Topbar } from "@/components/saas/layout/topbar";
import type { CurrentSaasUser } from "@/types/saas";

export function AppShell({ user, children }: { user: CurrentSaasUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
