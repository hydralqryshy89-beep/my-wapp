// Central place for all "enum-like" values used across the app.
// Postgres values are plain strings (English codes) with Arabic labels
// shown in the UI — validated here rather than via a native enum type.

export const COURSE_STATUSES = ["DRAFT", "OPEN", "FULL", "COMPLETED", "CANCELLED"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: "مسودة",
  OPEN: "التسجيل مفتوح",
  FULL: "مكتملة",
  COMPLETED: "منتهية",
  CANCELLED: "ملغاة",
};

export const REGISTRATION_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: "بانتظار التأكيد",
  CONFIRMED: "مؤكد",
  CANCELLED: "ملغي",
  COMPLETED: "مكتمل",
};

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقداً",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
};

// Suggestions only (shown via a <datalist>) — not enforced, per spec §7.
export const PROFESSION_SUGGESTIONS = ["طبيب أسنان", "طبيب", "صيدلاني", "ممرض/ممرضة", "طالب", "أخرى"] as const;

export const CURRENCIES = ["IQD", "USD", "SAR", "AED"] as const;

export const USER_ROLES = ["ADMIN", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  STAFF: "موظف",
};

export const STATUS_BADGE_STYLES: Record<string, string> = {
  // Course statuses
  "مسودة": "bg-slate-100 text-slate-700 ring-slate-200",
  "التسجيل مفتوح": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "مكتملة": "bg-amber-50 text-amber-700 ring-amber-200",
  "منتهية": "bg-blue-50 text-blue-700 ring-blue-200",
  "ملغاة": "bg-rose-50 text-rose-700 ring-rose-200",
  // Registration statuses
  "بانتظار التأكيد": "bg-amber-50 text-amber-700 ring-amber-200",
  "مؤكد": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "ملغي": "bg-rose-50 text-rose-700 ring-rose-200",
  "مكتمل": "bg-blue-50 text-blue-700 ring-blue-200",
};

export const ATTENDANCE_BADGE_STYLES: Record<string, string> = {
  "حاضر": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "غائب": "bg-rose-50 text-rose-700 ring-rose-200",
};
