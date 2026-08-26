import {
  LayoutDashboard,
  Compass,
  Target,
  Rocket,
  CalendarDays,
  Wallet,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PermissionResource } from "@/lib/constants";
import { can, type CurrentUser } from "@/lib/access";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission resource that gates this item. Omit for items visible to any signed-in user. */
  resource?: PermissionResource;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, resource: "dashboard" },
  { href: "/plans", label: "الخطة التسويقية", icon: Compass, resource: "plans" },
  { href: "/objectives", label: "الأهداف و KPI", icon: Target, resource: "objectives" },
  { href: "/campaigns", label: "الحملات", icon: Rocket, resource: "campaigns" },
  { href: "/content", label: "تقويم المحتوى", icon: CalendarDays, resource: "content" },
  { href: "/budget", label: "الميزانية", icon: Wallet, resource: "budget" },
  { href: "/analytics", label: "النتائج والتحليلات", icon: BarChart3, resource: "analytics" },
  { href: "/tasks", label: "الفريق والمهام", icon: Users, resource: "tasks" },
  { href: "/settings", label: "الإعدادات", icon: Settings, resource: "settings" },
];

/** Where to land a user right after login: their first viewable section, in nav order. */
export function firstAccessiblePath(user: CurrentUser): string {
  const item = NAV_ITEMS.find((i) => !i.resource || can(user, i.resource, "VIEW"));
  return item?.href ?? "/dashboard";
}
