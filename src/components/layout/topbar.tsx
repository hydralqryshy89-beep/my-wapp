import { LogOut } from "lucide-react";
import { getSettings } from "@/lib/data/settings";
import { logout } from "@/app/actions/auth";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/access";

export async function Topbar({ user }: { user: CurrentUser }) {
  const settings = await getSettings();
  const today = new Intl.DateTimeFormat("ar-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 md:flex">
      <div>
        <div className="text-sm font-semibold text-foreground">{settings.academyName}</div>
        <div className="text-xs text-muted">{today}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-left leading-tight">
          <div className="text-sm font-semibold text-foreground">{user.name}</div>
          <div className="text-xs text-muted">{USER_ROLE_LABELS[user.role]}</div>
        </div>
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            {user.name.slice(0, 1)}
          </div>
        )}
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
