import { prisma } from "@/lib/prisma";
import { sumMetrics, roi, budgetUtilization } from "@/lib/calculations";

export async function getCurrentPlan() {
  const active = await prisma.plan.findFirst({
    where: { status: "نشطة" },
    orderBy: { startDate: "desc" },
  });
  if (active) return active;

  return prisma.plan.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function getDashboardData() {
  const plan = await getCurrentPlan();

  if (!plan) {
    return null;
  }

  const [campaigns, contentCount, expenses, metrics, upcomingContent, tasks] =
    await Promise.all([
      prisma.campaign.findMany({ where: { planId: plan.id } }),
      prisma.content.count({ where: { planId: plan.id } }),
      prisma.expense.findMany({ where: { planId: plan.id } }),
      prisma.metric.findMany({ where: { planId: plan.id } }),
      prisma.content.findMany({
        where: { planId: plan.id },
        orderBy: { date: "asc" },
        take: 5,
        include: { campaign: true, assignedTo: true },
      }),
      prisma.task.findMany({
        where: { planId: plan.id, status: { not: "مكتملة" } },
        orderBy: { dueDate: "asc" },
        include: { assignedTo: true, campaign: true },
      }),
    ]);

  const totals = sumMetrics(metrics);
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "نشطة").length;

  const campaignPerformance = await Promise.all(
    campaigns.map(async (c) => {
      const campaignMetrics = await prisma.metric.findMany({ where: { campaignId: c.id } });
      const t = sumMetrics(campaignMetrics);
      return {
        name: c.name,
        spend: t.spend,
        revenue: t.revenue,
        leads: t.leads,
      };
    })
  );

  const now = new Date();
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now);

  return {
    plan,
    budget: plan.budget,
    totalSpend,
    budgetUtilization: budgetUtilization(totalSpend, plan.budget),
    activeCampaigns,
    contentCount,
    leads: totals.leads,
    sales: totals.sales,
    revenue: totals.revenue,
    roi: roi(totals.revenue, totals.spend),
    campaignPerformance,
    upcomingContent,
    tasks: tasks.slice(0, 6),
    overdueCount: overdueTasks.length,
  };
}
