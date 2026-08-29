// Meta's account_status is a numeric code — translate the common ones to
// Arabic for display; anything unrecognized just falls back to the raw code.
const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  "1": "نشط",
  "2": "معطل",
  "3": "غير مسدد",
  "7": "قيد مراجعة المخاطر",
  "8": "قيد التسوية",
  "9": "فترة سماح",
  "100": "قيد الإغلاق",
  "101": "مغلق",
};

export function formatMetaAccountStatus(status: string | null): string {
  if (!status) return "—";
  return ACCOUNT_STATUS_LABELS[status] ?? status;
}

// Meta campaign/ad-set/ad status values are all the same plain-word vocabulary
// (ACTIVE, PAUSED, ...), with ads adding a few review-related ones on top —
// one shared map covers all three entity types.
const ENTITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشطة",
  PAUSED: "متوقفة مؤقتاً",
  DELETED: "محذوفة",
  ARCHIVED: "مؤرشفة",
  IN_PROCESS: "قيد المعالجة",
  WITH_ISSUES: "بها مشاكل",
  PENDING_REVIEW: "قيد المراجعة",
  DISAPPROVED: "مرفوضة",
  PREAPPROVED: "معتمدة مسبقاً",
  PENDING_BILLING_INFO: "بانتظار معلومات الفوترة",
  CAMPAIGN_PAUSED: "متوقفة (الحملة موقوفة)",
  ADSET_PAUSED: "متوقفة (المجموعة الإعلانية موقوفة)",
};

export function formatMetaCampaignStatus(status: string | null): string {
  if (!status) return "—";
  return ENTITY_STATUS_LABELS[status] ?? status;
}

export function formatMetaEntityStatus(status: string | null): string {
  return formatMetaCampaignStatus(status);
}
