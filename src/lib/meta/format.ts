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
