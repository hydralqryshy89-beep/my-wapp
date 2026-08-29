"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { visibleNavItems } from "./nav-items";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/access";

function NavLinks({ user, onNavigate }: { user: CurrentUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = visibleNavItems(user);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--sidebar-active)] text-white"
                : "text-[var(--sidebar-fg)] hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar toggle */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[var(--sidebar-bg)] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <GraduationCap size={20} />
          <span className="font-bold">الأكاديمية</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-white hover:bg-white/10"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col bg-[var(--sidebar-bg)]">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2 text-white">
                <GraduationCap size={20} />
                <span className="font-bold">الأكاديمية</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-white hover:bg-white/10"
                aria-label="إغلاق القائمة"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[var(--sidebar-bg)] md:flex">
        <div className="flex items-center gap-2 px-5 py-6 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]">
            <GraduationCap size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-bold">الأكاديمية</div>
            <div className="text-xs text-[var(--sidebar-fg)]">إدارة الأكاديمية</div>
          </div>
        </div>
        <NavLinks user={user} />
        <div className="border-t border-white/10 px-5 py-4 text-xs text-[var(--sidebar-fg)]">
          الأكاديمية © {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
