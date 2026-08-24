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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/plans", label: "الخطة التسويقية", icon: Compass },
  { href: "/objectives", label: "الأهداف و KPI", icon: Target },
  { href: "/campaigns", label: "الحملات", icon: Rocket },
  { href: "/content", label: "تقويم المحتوى", icon: CalendarDays },
  { href: "/budget", label: "الميزانية", icon: Wallet },
  { href: "/analytics", label: "النتائج والتحليلات", icon: BarChart3 },
  { href: "/tasks", label: "الفريق والمهام", icon: Users },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];
