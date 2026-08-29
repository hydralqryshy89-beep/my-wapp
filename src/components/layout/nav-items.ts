import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  Wallet,
  CalendarCheck,
  Award,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { CurrentUser } from "@/lib/access";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only Admin sees this item. Omit for items visible to any signed-in user. */
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/courses", label: "الدورات", icon: BookOpen },
  { href: "/students", label: "الطلاب", icon: Users },
  { href: "/registrations", label: "التسجيلات", icon: ClipboardList },
  { href: "/payments", label: "المدفوعات", icon: Wallet },
  { href: "/attendance", label: "الحضور", icon: CalendarCheck },
  { href: "/certificates", label: "الشهادات", icon: Award },
  { href: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
];

export function visibleNavItems(user: CurrentUser): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || user.isAdmin);
}

/** Where to land a user right after login: their first accessible section. */
export function firstAccessiblePath(): string {
  return "/dashboard";
}
