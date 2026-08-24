import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ButtonLink } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { budgetUtilization, kpiProgress, planDurationDays, planTimeProgress } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { deletePlan } from "@/app/actions/plans";
import { deleteObjective } from "@/app/actions/objectives";
import { deleteExpense } from "@/app/actions/expenses";
import { deleteTask } from "@/app/actions/tasks";
import { Target, Rocket, FileText, Wallet, ListChecks, Compass } from "lucide-react";

const TABS = [
  { key: "overview", label: "نظرة عامة", icon: Compass },
  { key: "objectives", label: "الأهداف", icon: Target },
  { key: "campaigns", label: "الحملات", icon: Rocket },
  { key: "content", label: "المحتوى", icon: FileText },
  { key: "budget", label: "الميزانية", icon: Wallet },
  { key: "tasks", label: "المهام", icon: ListChecks },
];

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const company = await getCompany();

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      brand: true,
      objectives: true,
      campaigns: { include: { assignedTo: true } },
      content: { include: { campaign: true, assignedTo: true }, orderBy: { date: "asc" } },
      expenses: { include: { campaign: true }, orderBy: { date: "desc" } },
      tasks: { include: { assignedTo: true, campaign: true }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!plan) notFound();

  const totalSpend = plan.expenses.reduce((s, e) => s + e.amount, 0);
  const util = budgetUtilization(totalSpend, plan.budget);
  const durationDays = planDurationDays(plan.startDate, plan.endDate);
  const timeProgress = planTimeProgress(plan.startDate, plan.endDate);

  return (
    <div>
      <PageHeader
        title={plan.name}
        description={plan.brand?.name ?? "كل البراندات"}
        action={
          <div className="flex gap-2">
            <ButtonLink href={`/plans/${plan.id}/edit`} variant="outline">
              <Pencil size={14} /> تعديل
            </ButtonLink>
            <DeleteButton
              action={deletePlan.bind(null, plan.id)}
              confirmText="سيتم حذف الخطة وكل ما يرتبط بها (حملات، محتوى، مهام، مصروفات). هل أنت متأكد؟"
              className="border border-border"
            />
          </div>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/plans/${plan.id}?tab=${t.key}`}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon size={15} /> {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-5">
            <p className="mb-1 text-xs text-muted">الهدف الرئيسي</p>
            <p className="font-medium text-foreground">{plan.mainGoal || "—"}</p>
            {plan.description && <p className="mt-3 text-sm text-muted">{plan.description}</p>}
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted">حالة الخطة</p>
              <Badge>{plan.status}</Badge>
            </div>
            <p className="mb-1 text-xs text-muted">مدة الخطة</p>
            <p className="mb-3 text-sm font-medium text-foreground">
              {formatDate(plan.startDate)} — {formatDate(plan.endDate)} ({durationDays} يوم)
            </p>
            <p className="mb-1 text-xs text-muted">التقدم الزمني</p>
            <ProgressBar value={timeProgress} size="sm" />
          </Card>
          <Card className="p-5">
            <p className="mb-2 text-xs text-muted">الميزانية</p>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-bold text-foreground">{formatCurrency(totalSpend, company.currency)}</span>
              <span className="text-muted">من {formatCurrency(plan.budget, company.currency)}</span>
            </div>
            <ProgressBar value={util} />
            <p className="mt-2 text-xs text-muted">نسبة الصرف {formatPercent(util)}</p>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-xs text-muted">ملخص سريع</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{plan.campaigns.length}</p>
                <p className="text-xs text-muted">حملات</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{plan.content.length}</p>
                <p className="text-xs text-muted">محتوى</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{plan.tasks.length}</p>
                <p className="text-xs text-muted">مهام</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "objectives" && (
        <Card>
          <CardHeader>
            <CardTitle>الأهداف و KPI</CardTitle>
            <ButtonLink href={`/objectives/new?planId=${plan.id}`} size="sm">
              <Plus size={14} /> إضافة هدف
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {plan.objectives.length === 0 ? (
              <EmptyState icon={Target} title="لا توجد أهداف بعد" />
            ) : (
              <div className="flex flex-col gap-4">
                {plan.objectives.map((o) => {
                  const progress = kpiProgress(o.current, o.target);
                  return (
                    <div key={o.id} className="rounded-lg border border-border p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{o.name}</p>
                          <p className="text-xs text-muted">{o.kpiType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/objectives/${o.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                            تعديل
                          </Link>
                          <DeleteButton action={deleteObjective.bind(null, o.id)} />
                        </div>
                      </div>
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span>
                          Current: {o.current.toLocaleString("ar-u-nu-latn")} {o.unit}
                        </span>
                        <span>
                          Target: {o.target.toLocaleString("ar-u-nu-latn")} {o.unit}
                        </span>
                      </div>
                      <ProgressBar value={progress} size="sm" />
                      <p className="mt-1 text-left text-xs font-semibold text-primary">{formatPercent(progress)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "campaigns" && (
        <Card>
          <CardHeader>
            <CardTitle>الحملات</CardTitle>
            <ButtonLink href={`/campaigns/new?planId=${plan.id}`} size="sm">
              <Plus size={14} /> إنشاء حملة
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {plan.campaigns.length === 0 ? (
              <EmptyState icon={Rocket} title="لا توجد حملات بعد" />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>الحملة</Th>
                    <Th>الفترة</Th>
                    <Th>الميزانية</Th>
                    <Th>المسؤول</Th>
                    <Th>الحالة</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {plan.campaigns.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted">
                        {formatDate(c.startDate)} — {formatDate(c.endDate)}
                      </Td>
                      <Td>{formatCurrency(c.budget, company.currency)}</Td>
                      <Td>{c.assignedTo?.name ?? "—"}</Td>
                      <Td>
                        <Badge>{c.status}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "content" && (
        <Card>
          <CardHeader>
            <CardTitle>المحتوى</CardTitle>
            <ButtonLink href={`/content/new?planId=${plan.id}`} size="sm">
              <Plus size={14} /> إضافة محتوى
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {plan.content.length === 0 ? (
              <EmptyState icon={FileText} title="لا يوجد محتوى بعد" />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>المحتوى</Th>
                    <Th>التاريخ</Th>
                    <Th>المنصة</Th>
                    <Th>النوع</Th>
                    <Th>المسؤول</Th>
                    <Th>الحالة</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {plan.content.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <Link href={`/content/${c.id}/edit`} className="font-medium text-primary hover:underline">
                          {c.title}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted">{formatDate(c.date)}</Td>
                      <Td>{c.platform}</Td>
                      <Td>{c.type}</Td>
                      <Td>{c.assignedTo?.name ?? "—"}</Td>
                      <Td>
                        <Badge>{c.status}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "budget" && (
        <Card>
          <CardHeader>
            <CardTitle>الميزانية والمصروفات</CardTitle>
            <ButtonLink href={`/budget/new?planId=${plan.id}`} size="sm">
              <Plus size={14} /> إضافة مصروف
            </ButtonLink>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted-surface p-3">
                <p className="text-xs text-muted">الإجمالي</p>
                <p className="font-bold text-foreground">{formatCurrency(plan.budget, company.currency)}</p>
              </div>
              <div className="rounded-lg bg-muted-surface p-3">
                <p className="text-xs text-muted">المصروف</p>
                <p className="font-bold text-foreground">{formatCurrency(totalSpend, company.currency)}</p>
              </div>
              <div className="rounded-lg bg-muted-surface p-3">
                <p className="text-xs text-muted">المتبقي</p>
                <p className="font-bold text-foreground">
                  {formatCurrency(plan.budget - totalSpend, company.currency)}
                </p>
              </div>
            </div>
            {plan.expenses.length === 0 ? (
              <EmptyState icon={Wallet} title="لا توجد مصروفات بعد" />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>التاريخ</Th>
                    <Th>الوصف</Th>
                    <Th>الحملة</Th>
                    <Th>التصنيف</Th>
                    <Th>المبلغ</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {plan.expenses.map((e) => (
                    <Tr key={e.id}>
                      <Td className="text-xs text-muted">{formatDate(e.date)}</Td>
                      <Td>{e.description || "—"}</Td>
                      <Td>{e.campaign?.name ?? "—"}</Td>
                      <Td>
                        <Badge>{e.category}</Badge>
                      </Td>
                      <Td>{formatCurrency(e.amount, company.currency)}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <Link href={`/budget/${e.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                            تعديل
                          </Link>
                          <DeleteButton action={deleteExpense.bind(null, e.id)} />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "tasks" && (
        <Card>
          <CardHeader>
            <CardTitle>المهام</CardTitle>
            <ButtonLink href={`/tasks/new?planId=${plan.id}`} size="sm">
              <Plus size={14} /> إضافة مهمة
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {plan.tasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="لا توجد مهام بعد" />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>المهمة</Th>
                    <Th>الحملة</Th>
                    <Th>المسؤول</Th>
                    <Th>الأولوية</Th>
                    <Th>الحالة</Th>
                    <Th>الموعد</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {plan.tasks.map((t) => (
                    <Tr key={t.id}>
                      <Td>
                        <Link href={`/tasks/${t.id}/edit`} className="font-medium text-primary hover:underline">
                          {t.title}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted">{t.campaign?.name ?? "—"}</Td>
                      <Td>{t.assignedTo?.name ?? "—"}</Td>
                      <Td>
                        <Badge variant="priority">{t.priority}</Badge>
                      </Td>
                      <Td>
                        <Badge>{t.status}</Badge>
                      </Td>
                      <Td className="text-xs text-muted">{t.dueDate ? formatDate(t.dueDate) : "—"}</Td>
                      <Td>
                        <DeleteButton action={deleteTask.bind(null, t.id)} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
