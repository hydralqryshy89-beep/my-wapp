import Link from "next/link";
import { Plus, ListChecks, Search, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getCompany, getUsers } from "@/lib/data/company";
import { deleteTask, updateTaskStatus } from "@/app/actions/tasks";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";
  const user = await requireUser();
  if (!can(user, "tasks", "VIEW")) return <AccessDenied label="الفريق والمهام" />;
  const canEdit = can(user, "tasks", "EDIT");
  const company = await getCompany();
  const users = await getUsers();

  const tasks = await prisma.task.findMany({
    where: {
      plan: { companyId: company.id },
      ...(sp.q ? { title: { contains: sp.q } } : {}),
      ...(sp.status ? { status: sp.status } : {}),
      ...(sp.priority ? { priority: sp.priority } : {}),
      ...(sp.assignedToId ? { assignedToId: sp.assignedToId } : {}),
    },
    include: { assignedTo: true, campaign: true },
    orderBy: { dueDate: "asc" },
  });

  const nextStatus: Record<string, string> = {
    "جديدة": "قيد التنفيذ",
    "قيد التنفيذ": "مكتملة",
  };

  return (
    <div>
      <PageHeader
        title="الفريق والمهام"
        description="تابع مهام فريقك عبر جميع الحملات"
        action={
          canEdit ? (
            <ButtonLink href="/tasks/new">
              <Plus size={16} /> إضافة مهمة
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted-surface p-1">
          {[
            { key: "kanban", label: "Kanban" },
            { key: "list", label: "قائمة" },
          ].map((v) => (
            <Link
              key={v.key}
              href={`/tasks?view=${v.key}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === v.key ? "bg-surface shadow-sm text-primary" : "text-muted hover:text-foreground"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <input type="hidden" name="view" value={view} />
          <div className="relative min-w-48 flex-1">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={sp.q}
              placeholder="بحث عن مهمة..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select name="assignedToId" defaultValue={sp.assignedToId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل الأعضاء</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue={sp.priority ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل الأولويات</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {view === "list" && (
            <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">كل الحالات</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="لا توجد مهام"
          action={canEdit ? <ButtonLink href="/tasks/new">+ إضافة مهمة</ButtonLink> : undefined}
        />
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="rounded-xl bg-muted-surface/60 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-foreground">{status}</h3>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{columnTasks.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {columnTasks.map((t) => {
                    const overdue = t.dueDate && t.dueDate < new Date() && t.status !== "مكتملة";
                    const next = nextStatus[t.status];
                    return (
                      <Card key={t.id} className="p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <Link href={`/tasks/${t.id}/edit`} className="text-sm font-medium text-foreground hover:text-primary">
                            {t.title}
                          </Link>
                          <Badge variant="priority">{t.priority}</Badge>
                        </div>
                        {t.campaign && <p className="mb-1 text-xs text-muted">{t.campaign.name}</p>}
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-muted">{t.assignedTo?.name ?? "—"}</span>
                          <span className={overdue ? "font-medium text-danger" : "text-muted"}>
                            {t.dueDate ? formatDate(t.dueDate) : "—"}
                          </span>
                        </div>
                        {next && canEdit && (
                          <form action={updateTaskStatus.bind(null, t.id, next)}>
                            <button
                              type="submit"
                              className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary-soft py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              نقل إلى {next} <ArrowLeft size={12} />
                            </button>
                          </form>
                        )}
                      </Card>
                    );
                  })}
                  {columnTasks.length === 0 && <p className="px-1 text-xs text-muted">لا توجد مهام</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-0">
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
              {tasks.map((t) => {
                const overdue = t.dueDate && t.dueDate < new Date() && t.status !== "مكتملة";
                return (
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
                    <Td className={overdue ? "text-xs font-medium text-danger" : "text-xs text-muted"}>
                      {t.dueDate ? formatDate(t.dueDate) : "—"}
                    </Td>
                    <Td>{canEdit && <DeleteButton action={deleteTask.bind(null, t.id)} />}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
