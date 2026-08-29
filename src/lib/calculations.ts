// Real, derived calculations from raw DB records — never hard-coded.

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

export function cpl(spend: number, leads: number): number {
  return safeDiv(spend, leads);
}

export function conversionRate(sales: number, leads: number): number {
  return safeDiv(sales, leads) * 100;
}

export function roi(revenue: number, spend: number): number {
  return safeDiv(revenue - spend, spend) * 100;
}

export function roas(revenue: number, spend: number): number {
  return safeDiv(revenue, spend);
}

export function budgetUtilization(spend: number, budget: number): number {
  return safeDiv(spend, budget) * 100;
}

// Ad-platform ratios (CTR/CPC/CPM/frequency) — used by Meta Analytics, but
// generic enough to belong here with the rest of the real, derived math.
export function ctr(clicks: number, impressions: number): number {
  return safeDiv(clicks, impressions) * 100;
}

export function cpc(spend: number, clicks: number): number {
  return safeDiv(spend, clicks);
}

export function cpm(spend: number, impressions: number): number {
  return safeDiv(spend, impressions) * 1000;
}

export function frequency(impressions: number, reach: number): number {
  return safeDiv(impressions, reach);
}

export function planDurationDays(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
}

export function planTimeProgress(startDate: Date, endDate: Date): number {
  const durationDays = planDurationDays(startDate, endDate);
  const elapsedDays = Math.min(
    durationDays,
    Math.max(0, Math.round((Date.now() - startDate.getTime()) / 86_400_000))
  );
  return Math.min(100, (elapsedDays / durationDays) * 100);
}

export function kpiProgress(current: number, target: number): number {
  if (!target) return 0;
  return Math.min(100, (current / target) * 100);
}

export interface MetricTotals {
  reach: number;
  impressions: number;
  views: number;
  engagement: number;
  leads: number;
  sales: number;
  revenue: number;
  spend: number;
}

export function sumMetrics(
  metrics: Array<{
    reach: number;
    impressions: number;
    views: number;
    engagement: number;
    leads: number;
    sales: number;
    revenue: number;
    spend: number;
  }>
): MetricTotals {
  return metrics.reduce(
    (acc, m) => ({
      reach: acc.reach + m.reach,
      impressions: acc.impressions + m.impressions,
      views: acc.views + m.views,
      engagement: acc.engagement + m.engagement,
      leads: acc.leads + m.leads,
      sales: acc.sales + m.sales,
      revenue: acc.revenue + m.revenue,
      spend: acc.spend + m.spend,
    }),
    {
      reach: 0,
      impressions: 0,
      views: 0,
      engagement: 0,
      leads: 0,
      sales: 0,
      revenue: 0,
      spend: 0,
    }
  );
}
