import { LogOut } from "lucide-react";
import { getCompany } from "@/lib/data/company";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/permissions";

export async function Topbar({ user }: { user: CurrentUser }) {
  const company = await getCompany();
  const today = new Intl.DateTimeFormat("ar-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 md:flex">
      <div>
        <div className="text-sm font-semibold text-foreground">{company.name}</div>
        <div className="text-xs text-muted">{today}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-left leading-tight">
          <div className="text-sm font-semibold text-foreground">{user.name}</div>
          <div className="text-xs text-muted">{user.accessRoleName ?? user.jobTitle ?? ""}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {user.name.slice(0, 1)}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-muted-surface hover:text-foreground"
            title="تسجيل الخروج"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
