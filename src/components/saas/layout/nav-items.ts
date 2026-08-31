import { LayoutDashboard, FolderKanban, Building2 } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/saas/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saas/projects", label: "Projects", icon: FolderKanban },
  { href: "/saas/organizations", label: "Organizations", icon: Building2 },
] as const;
