import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PERMISSION_RESOURCES, type PermissionLevel } from "../src/lib/constants";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ---- Company & Brands ----------------------------------------------
  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      name: "الشركة العالمية للسيارات",
      currency: "IQD",
      language: "ar",
    },
  });

  const brandNames = ["BYD", "MG", "ROX", "Global Multi Brand"];
  const brands: Record<string, string> = {};
  for (const name of brandNames) {
    const id = `seed-brand-${name.replace(/\s+/g, "-").toLowerCase()}`;
    const brand = await prisma.brand.upsert({
      where: { id },
      update: {},
      create: { id, companyId: company.id, name },
    });
    brands[name] = brand.id;
  }

  // ---- Access roles (custom permission matrices) ------------------------
  const NONE: PermissionLevel = "NONE";
  const VIEW: PermissionLevel = "VIEW";
  const EDIT: PermissionLevel = "EDIT";

  const rolesData = [
    {
      key: "admin",
      id: "seed-role-admin",
      name: "مدير النظام",
      isAdmin: true,
      perms: Object.fromEntries(PERMISSION_RESOURCES.map((r) => [r, EDIT])),
    },
    {
      key: "campaignManager",
      id: "seed-role-campaign-manager",
      name: "مسؤول حملات",
      isAdmin: false,
      perms: {
        dashboard: VIEW,
        plans: VIEW,
        objectives: VIEW,
        campaigns: EDIT,
        content: EDIT,
        budget: VIEW,
        analytics: VIEW,
        tasks: EDIT,
        settings: NONE,
      },
    },
    {
      key: "teamMember",
      id: "seed-role-team-member",
      name: "عضو فريق",
      isAdmin: false,
      perms: {
        // Regular team members land on their content/tasks, not the company-wide dashboard.
        dashboard: NONE,
        plans: VIEW,
        objectives: VIEW,
        campaigns: VIEW,
        content: EDIT,
        budget: NONE,
        analytics: NONE,
        tasks: EDIT,
        settings: NONE,
      },
    },
    {
      key: "analyst",
      id: "seed-role-analyst",
      name: "محلل بيانات",
      isAdmin: false,
      perms: {
        dashboard: VIEW,
        plans: VIEW,
        objectives: VIEW,
        campaigns: VIEW,
        content: NONE,
        budget: VIEW,
        analytics: EDIT,
        tasks: VIEW,
        settings: NONE,
      },
    },
  ] as const;

  // Every upsert below only touches its `create` branch on rows that don't exist yet —
  // `update: {}` deliberately leaves already-existing rows untouched. This seed re-runs
  // on every deploy (see package.json's vercel-build), and once an admin starts editing
  // roles/permissions/users from Settings, redeploying must never silently revert them.
  const roles: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, companyId: company.id, name: r.name, isAdmin: r.isAdmin },
    });
    roles[r.key] = role.id;
    for (const resource of PERMISSION_RESOURCES) {
      await prisma.rolePermission.upsert({
        where: { roleId_resource: { roleId: role.id, resource } },
        update: {},
        create: { roleId: role.id, resource, level: r.perms[resource] },
      });
    }
  }

  // Bootstrap safety net: the "seed-role-admin" role is the only way into the
  // Roles & Permissions and Users screens (both are admin-only), so if it ever
  // loses isAdmin — e.g. an accidental save with the checkbox unticked, before
  // the guard in src/app/actions/roles.ts existed to stop that — nobody could
  // fix it back from the UI anymore. Unlike every other seed row, always force
  // this one back to true rather than leaving it alone once created.
  await prisma.role.update({ where: { id: "seed-role-admin" }, data: { isAdmin: true } });

  // ---- Users -----------------------------------------------------------
  // Demo login for every seeded user, for trying out the different roles:
  const DEMO_PASSWORD = "Demo@12345";
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const usersData = [
    { key: "ahmad", name: "أحمد الشمري", email: "ahmad@globalcars.iq", role: "مدير التسويق", accessRole: "admin" },
    { key: "sara", name: "سارة العلي", email: "sara@globalcars.iq", role: "مصممة جرافيك", accessRole: "teamMember" },
    { key: "ali", name: "علي حسن", email: "ali@globalcars.iq", role: "مسؤول حملات إعلانية", accessRole: "campaignManager" },
    { key: "noor", name: "نور محمد", email: "noor@globalcars.iq", role: "منشئة محتوى", accessRole: "teamMember" },
    { key: "hussein", name: "حسين كريم", email: "hussein@globalcars.iq", role: "محلل بيانات", accessRole: "analyst" },
  ];
  const users: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accessRoleId: roles[u.accessRole],
        passwordHash: demoPasswordHash,
      },
    });
    users[u.key] = user.id;
  }

  // ---- Marketing Plan ----------------------------------------------------
  const plan = await prisma.plan.upsert({
    where: { id: "seed-plan-1" },
    update: {},
    create: {
      id: "seed-plan-1",
      companyId: company.id,
      brandId: brands["Global Multi Brand"],
      name: "الخطة التسويقية — سبتمبر 2026",
      description: "خطة تسويقية شاملة لعلامات الشركة خلال شهر سبتمبر لدفع المبيعات وزيادة الوعي بالعلامات.",
      period: "سبتمبر 2026",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
      budget: 3_000_000,
      mainGoal: "زيادة المبيعات والوعي بعلامات الشركة خلال سبتمبر 2026",
      status: "نشطة",
    },
  });

  // ---- Objectives / KPIs -------------------------------------------------
  const objectives = [
    {
      id: "seed-obj-1",
      name: "زيادة العملاء المحتملين (Leads) بنسبة 40%",
      kpiType: "Leads",
      target: 1400,
      current: 1000,
      unit: "Lead",
    },
    {
      id: "seed-obj-2",
      name: "توسيع الوصول (Reach)",
      kpiType: "Reach",
      target: 400_000,
      current: 278_000,
      unit: "شخص",
    },
    {
      id: "seed-obj-3",
      name: "تحسين معدل التحويل",
      kpiType: "Conversion Rate",
      target: 15,
      current: 11.1,
      unit: "%",
    },
    {
      id: "seed-obj-4",
      name: "خفض تكلفة اكتساب العميل (CPL)",
      kpiType: "CPL",
      target: 1000,
      current: 1180,
      unit: "IQD",
    },
    {
      id: "seed-obj-5",
      name: "رفع العائد على الاستثمار (ROI)",
      kpiType: "ROI",
      target: 60,
      current: 27.6,
      unit: "%",
    },
  ];
  for (const o of objectives) {
    await prisma.objective.upsert({
      where: { id: o.id },
      update: {},
      create: { ...o, planId: plan.id },
    });
  }

  // ---- Campaigns ----------------------------------------------------------
  const campaignsData = [
    {
      id: "seed-camp-byd",
      brand: "BYD",
      name: "حملة إطلاق BYD الجديدة",
      objective: "زيادة المبيعات والوعي بموديل BYD الجديد",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
      budget: 1_200_000,
      platforms: "Facebook,Instagram",
      audience: "الشريحة العمرية 25-45، بغداد والمحافظات الكبرى",
      assignedToId: users["ali"],
      status: "نشطة",
    },
    {
      id: "seed-camp-mg",
      brand: "MG",
      name: "حملة MG للموديل الجديد",
      objective: "تعزيز الوعي بالموديل الجديد وجذب عملاء محتملين",
      startDate: new Date("2026-09-03"),
      endDate: new Date("2026-09-28"),
      budget: 900_000,
      platforms: "TikTok,Instagram",
      audience: "فئة الشباب 20-35",
      assignedToId: users["ali"],
      status: "نشطة",
    },
    {
      id: "seed-camp-rox",
      brand: "ROX",
      name: "حملة التوعية بعلامة ROX",
      objective: "بناء الوعي بالعلامة الجديدة ROX في السوق",
      startDate: new Date("2026-09-05"),
      endDate: new Date("2026-09-30"),
      budget: 900_000,
      platforms: "Facebook,WhatsApp",
      audience: "عموم السوق العراقي",
      assignedToId: users["ahmad"],
      status: "مخطط",
    },
  ];
  for (const c of campaignsData) {
    const { brand, ...rest } = c;
    await prisma.campaign.upsert({
      where: { id: c.id },
      update: {},
      create: { ...rest, planId: plan.id, brandId: brands[brand] },
    });
  }

  // ---- Content Calendar -----------------------------------------------
  const contentData = [
    { id: "seed-content-1", campaignId: "seed-camp-byd", title: "ريلز إطلاق BYD الجديدة", type: "Reel", platform: "Instagram", date: "2026-09-02", status: "منشور", assignedToId: users["noor"] },
    { id: "seed-content-2", campaignId: "seed-camp-byd", title: "بوست تعريفي بموديل BYD", type: "Post", platform: "Facebook", date: "2026-09-03", status: "منشور", assignedToId: users["noor"] },
    { id: "seed-content-3", campaignId: "seed-camp-byd", title: "ستوري كواليس التصوير", type: "Story", platform: "Instagram", date: "2026-09-05", status: "جاهز", assignedToId: users["sara"] },
    { id: "seed-content-4", campaignId: "seed-camp-byd", title: "فيديو تجربة القيادة", type: "Video", platform: "Facebook", date: "2026-09-12", status: "قيد التنفيذ", assignedToId: users["noor"] },
    { id: "seed-content-5", campaignId: "seed-camp-mg", title: "كاروسيل مواصفات MG الجديدة", type: "Carousel", platform: "Instagram", date: "2026-09-06", status: "منشور", assignedToId: users["sara"] },
    { id: "seed-content-6", campaignId: "seed-camp-mg", title: "ريلز تحدي TikTok لسيارة MG", type: "Reel", platform: "TikTok", date: "2026-09-09", status: "منشور", assignedToId: users["noor"] },
    { id: "seed-content-7", campaignId: "seed-camp-mg", title: "بوست عرض تمويل MG", type: "Post", platform: "Facebook", date: "2026-09-20", status: "مراجعة", assignedToId: users["ali"] },
    { id: "seed-content-8", campaignId: "seed-camp-rox", title: "ستوري تشويقية لـROX", type: "Story", platform: "Instagram", date: "2026-09-04", status: "جاهز", assignedToId: users["sara"] },
    { id: "seed-content-9", campaignId: "seed-camp-rox", title: "بوست تعريف بعلامة ROX", type: "Post", platform: "Facebook", date: "2026-09-14", status: "فكرة", assignedToId: users["noor"] },
    { id: "seed-content-10", campaignId: "seed-camp-rox", title: "فيديو رسالة واتساب ترحيبية ROX", type: "Video", platform: "WhatsApp", date: "2026-09-22", status: "فكرة", assignedToId: users["ali"] },
  ];
  for (const c of contentData) {
    await prisma.content.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, planId: plan.id, date: new Date(c.date) },
    });
  }

  // ---- Expenses ------------------------------------------------------------
  const expensesData = [
    { id: "seed-exp-1", campaignId: "seed-camp-byd", category: "Meta Ads", description: "إعلانات فيسبوك وانستغرام BYD", amount: 600_000, date: "2026-09-08" },
    { id: "seed-exp-2", campaignId: "seed-camp-mg", category: "TikTok Ads", description: "إعلانات تيك توك MG", amount: 350_000, date: "2026-09-09" },
    { id: "seed-exp-3", campaignId: "seed-camp-rox", category: "Influencers", description: "تعاون مع مؤثرين لعلامة ROX", amount: 400_000, date: "2026-09-10" },
    { id: "seed-exp-4", campaignId: "seed-camp-byd", category: "Production", description: "إنتاج فيديو تجربة القيادة", amount: 200_000, date: "2026-09-11" },
    { id: "seed-exp-5", campaignId: "seed-camp-mg", category: "Design", description: "تصميم كاروسيل ومحتوى بصري", amount: 150_000, date: "2026-09-06" },
    { id: "seed-exp-6", campaignId: "seed-camp-byd", category: "Photography", description: "جلسة تصوير احترافية للموديل الجديد", amount: 100_000, date: "2026-09-04" },
    { id: "seed-exp-7", campaignId: "seed-camp-rox", category: "Other", description: "مصاريف تشغيلية متنوعة", amount: 50_000, date: "2026-09-12" },
  ];
  for (const e of expensesData) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: {},
      create: { ...e, planId: plan.id, date: new Date(e.date) },
    });
  }

  // ---- Metrics ---------------------------------------------------------
  const metricsData = [
    { id: "seed-metric-1", campaignId: "seed-camp-byd", platform: "Facebook", date: "2026-09-10", reach: 65_000, impressions: 160_000, views: 40_000, engagement: 8_000, leads: 220, sales: 30, revenue: 450_000, spend: 300_000 },
    { id: "seed-metric-2", campaignId: "seed-camp-byd", platform: "Instagram", date: "2026-09-20", reach: 55_000, impressions: 140_000, views: 38_000, engagement: 9_000, leads: 200, sales: 28, revenue: 420_000, spend: 300_000 },
    { id: "seed-metric-3", campaignId: "seed-camp-mg", platform: "TikTok", date: "2026-09-08", reach: 80_000, impressions: 190_000, views: 95_000, engagement: 14_000, leads: 260, sales: 25, revenue: 300_000, spend: 250_000 },
    { id: "seed-metric-4", campaignId: "seed-camp-mg", platform: "Instagram", date: "2026-09-18", reach: 40_000, impressions: 90_000, views: 25_000, engagement: 6_000, leads: 140, sales: 15, revenue: 180_000, spend: 150_000 },
    { id: "seed-metric-5", campaignId: "seed-camp-rox", platform: "Facebook", date: "2026-09-05", reach: 30_000, impressions: 70_000, views: 20_000, engagement: 4_000, leads: 100, sales: 8, revenue: 96_000, spend: 120_000 },
    { id: "seed-metric-6", campaignId: "seed-camp-rox", platform: "WhatsApp", date: "2026-09-15", reach: 8_000, impressions: 15_000, views: 5_000, engagement: 1_200, leads: 80, sales: 5, revenue: 60_000, spend: 60_000 },
  ];
  for (const m of metricsData) {
    await prisma.metric.upsert({
      where: { id: m.id },
      update: {},
      create: { ...m, planId: plan.id, date: new Date(m.date) },
    });
  }

  // ---- Tasks -------------------------------------------------------------
  const tasksData = [
    { id: "seed-task-1", campaignId: "seed-camp-byd", title: "تجهيز الهوية البصرية للحملة", description: "تصميم كافة عناصر الهوية البصرية لحملة BYD", assignedToId: users["sara"], priority: "عالية", status: "مكتملة", dueDate: "2026-08-15" },
    { id: "seed-task-2", campaignId: "seed-camp-byd", title: "تصوير محتوى الفيديو", description: "تصوير فيديو تجربة القيادة للموديل الجديد", assignedToId: users["noor"], priority: "عالية", status: "قيد التنفيذ", dueDate: "2026-08-22" },
    { id: "seed-task-3", campaignId: "seed-camp-mg", title: "مراجعة نصوص الإعلانات", description: "مراجعة وتدقيق نصوص إعلانات MG قبل النشر", assignedToId: users["ali"], priority: "متوسطة", status: "جديدة", dueDate: "2026-08-28" },
    { id: "seed-task-4", campaignId: "seed-camp-rox", title: "التنسيق مع المؤثرين", description: "التواصل والتنسيق مع المؤثرين لحملة ROX", assignedToId: users["ahmad"], priority: "عالية", status: "قيد التنفيذ", dueDate: "2026-08-30" },
    { id: "seed-task-5", campaignId: null, title: "إعداد تقرير أداء منتصف الحملة", description: "تجميع وتحليل أداء منتصف الخطة التسويقية", assignedToId: users["hussein"], priority: "متوسطة", status: "جديدة", dueDate: "2026-09-15" },
    { id: "seed-task-6", campaignId: "seed-camp-mg", title: "جدولة منشورات تيك توك", description: "جدولة منشورات الأسبوعين القادمين على تيك توك", assignedToId: users["noor"], priority: "منخفضة", status: "مكتملة", dueDate: "2026-08-18" },
    { id: "seed-task-7", campaignId: null, title: "مراجعة الميزانية الشهرية", description: "مراجعة المصروفات مقابل الميزانية المعتمدة", assignedToId: users["ahmad"], priority: "متوسطة", status: "جديدة", dueDate: "2026-09-01" },
    { id: "seed-task-8", campaignId: "seed-camp-rox", title: "تجربة إعلانات واتساب", description: "إعداد واختبار حملة إعلانات واتساب بزنس", assignedToId: users["ali"], priority: "منخفضة", status: "جديدة", dueDate: "2026-08-20" },
  ];
  for (const t of tasksData) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, planId: plan.id, dueDate: new Date(t.dueDate) },
    });
  }

  console.log("✅ Seed data created successfully.");
  console.log("");
  console.log("Demo logins (password for all: " + DEMO_PASSWORD + "):");
  for (const u of usersData) {
    console.log(`  ${u.email}  —  ${rolesData.find((r) => r.key === u.accessRole)?.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
