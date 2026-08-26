// Central place for all "enum-like" values used across the app.
// SQLite has no native enum type, so these are plain strings validated here.

export const PLAN_STATUSES = ["مخطط", "نشطة", "متوقفة", "مكتملة"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["مخطط", "نشطة", "متوقفة", "مكتملة"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CONTENT_TYPES = ["Reel", "Story", "Post", "Carousel", "Video"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ["فكرة", "قيد التنفيذ", "مراجعة", "جاهز", "منشور"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const PLATFORMS = ["Facebook", "Instagram", "TikTok", "WhatsApp"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const EXPENSE_CATEGORIES = [
  "Meta Ads",
  "TikTok Ads",
  "Influencers",
  "Production",
  "Design",
  "Photography",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const KPI_TYPES = [
  "Leads",
  "Reach",
  "Engagement",
  "Sales",
  "Revenue",
  "Conversion Rate",
  "CPL",
  "ROI",
] as const;
export type KpiType = (typeof KPI_TYPES)[number];

export const TASK_PRIORITIES = ["منخفضة", "متوسطة", "عالية"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["جديدة", "قيد التنفيذ", "مكتملة"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CURRENCIES = ["IQD", "USD", "SAR", "AED"] as const;

export const STATUS_BADGE_STYLES: Record<string, string> = {
  "مخطط": "bg-slate-100 text-slate-700 ring-slate-200",
  "نشطة": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "متوقفة": "bg-amber-50 text-amber-700 ring-amber-200",
  "مكتملة": "bg-blue-50 text-blue-700 ring-blue-200",
  "فكرة": "bg-slate-100 text-slate-700 ring-slate-200",
  "قيد التنفيذ": "bg-amber-50 text-amber-700 ring-amber-200",
  "مراجعة": "bg-purple-50 text-purple-700 ring-purple-200",
  "جاهز": "bg-blue-50 text-blue-700 ring-blue-200",
  "منشور": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "جديدة": "bg-slate-100 text-slate-700 ring-slate-200",
};

export const PRIORITY_BADGE_STYLES: Record<string, string> = {
  "منخفضة": "bg-slate-100 text-slate-700 ring-slate-200",
  "متوسطة": "bg-amber-50 text-amber-700 ring-amber-200",
  "عالية": "bg-rose-50 text-rose-700 ring-rose-200",
};

// Access control: every app section a role's access can be scoped to,
// including the dashboard itself — a role with no explicit grant defaults
// to NONE, same as every other section (see src/lib/access.ts's can()).
export const PERMISSION_RESOURCES = [
  "dashboard",
  "plans",
  "objectives",
  "campaigns",
  "content",
  "budget",
  "analytics",
  "tasks",
  "settings",
] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export const PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: "لوحة التحكم",
  plans: "الخطة التسويقية",
  objectives: "الأهداف و KPI",
  campaigns: "الحملات",
  content: "تقويم المحتوى",
  budget: "الميزانية",
  analytics: "النتائج والتحليلات",
  tasks: "الفريق والمهام",
  settings: "الإعدادات",
};

export const PERMISSION_LEVELS = ["NONE", "VIEW", "EDIT"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  NONE: "بدون وصول",
  VIEW: "عرض فقط",
  EDIT: "عرض وتعديل",
};
