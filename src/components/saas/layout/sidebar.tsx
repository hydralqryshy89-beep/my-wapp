"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Boxes } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
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

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <Boxes size={20} />
          <span className="font-bold">SaaS Builder</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-white hover:bg-white/10" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-slate-900">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2 text-white">
                <Boxes size={20} />
                <span className="font-bold">SaaS Builder</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-2 text-white hover:bg-white/10" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 md:flex">
        <div className="flex items-center gap-2 px-5 py-6 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Boxes size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-bold">SaaS Builder</div>
            <div className="text-xs text-slate-400">Platform foundation</div>
          </div>
        </div>
        <NavLinks />
        <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
          SaaS Builder © {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
