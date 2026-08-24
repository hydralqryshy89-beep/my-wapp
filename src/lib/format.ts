export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-u-nu-latn").format(Math.round(value));
}

export function formatCurrency(value: number, currency = "IQD"): string {
  return `${formatNumber(value)} ${currency}`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-u-nu-latn", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateInput(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}
