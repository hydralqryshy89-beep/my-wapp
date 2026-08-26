import Link from "next/link";
import { Plus, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDate, formatDateInput } from "@/lib/format";
import { getCompany } from "@/lib/data/company";
import { getCurrentPlan } from "@/lib/data/dashboard";
import { getMonthGrid, getWeekDays, WEEKDAY_LABELS } from "@/lib/calendar";
import { CONTENT_TYPES, CONTENT_STATUSES, PLATFORMS } from "@/lib/constants";
import { addMonths, addWeeks, isSameDay, format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

type SearchParams = {
  view?: string;
  date?: string;
  q?: string;
  type?: string;
  platform?: string;
  status?: string;
  campaignId?: string;
};

export default async function ContentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = sp.view === "week" || sp.view === "list" ? sp.view : "month";
  const user = await requireUser();
  if (!can(user, "content", "VIEW")) return <AccessDenied label="تقويم المحتوى" />;
  const canEdit = can(user, "content", "EDIT");
  const company = await getCompany();

  let anchor: Date;
  if (sp.date) {
    anchor = new Date(sp.date);
  } else {
    const currentPlan = await getCurrentPlan();
    anchor = currentPlan ? currentPlan.startDate : new Date();
  }

  const campaigns = await prisma.campaign.findMany({
    where: { plan: { companyId: company.id } },
    select: { id: true, name: true },
  });

  const baseWhere = {
    plan: { companyId: company.id },
    ...(sp.q ? { title: { contains: sp.q } } : {}),
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.platform ? { platform: sp.platform } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.campaignId ? { campaignId: sp.campaignId } : {}),
  };

  const allContent = await prisma.content.findMany({
    where: baseWhere,
    include: { campaign: true, assignedTo: true },
    orderBy: { date: "asc" },
  });

  function viewHref(v: string) {
    return `/content?view=${v}&date=${formatDateInput(anchor)}`;
  }

  return (
    <div>
      <PageHeader
        title="تقويم المحتوى"
        description="خطط وتابع محتوى حملاتك"
        action={
          canEdit ? (
            <ButtonLink href="/content/new">
              <Plus size={16} /> إضافة محتوى
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted-surface p-1">
          {[
            { key: "month", label: "شهري" },
            { key: "week", label: "أسبوعي" },
            { key: "list", label: "قائمة" },
          ].map((v) => (
            <Link
              key={v.key}
              href={viewHref(v.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === v.key ? "bg-surface shadow-sm text-primary" : "text-muted hover:text-foreground"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>

        {view !== "list" && (
          <div className="flex items-center gap-2">
            <Link
              href={`/content?view=${view}&date=${formatDateInput(
                view === "month" ? addMonths(anchor, -1) : addWeeks(anchor, -1)
              )}`}
              className="rounded-lg border border-border p-2 hover:bg-muted-surface"
            >
              <ChevronRight size={16} />
            </Link>
            <span className="min-w-32 text-center text-sm font-semibold text-foreground">
              {view === "month"
                ? format(anchor, "MMMM yyyy", { locale: ar })
                : `أسبوع ${format(getWeekDays(anchor)[0], "d MMM", { locale: ar })}`}
            </span>
            <Link
              href={`/content?view=${view}&date=${formatDateInput(
                view === "month" ? addMonths(anchor, 1) : addWeeks(anchor, 1)
              )}`}
              className="rounded-lg border border-border p-2 hover:bg-muted-surface"
            >
              <ChevronLeft size={16} />
            </Link>
          </div>
        )}
      </div>

      {view === "list" && (
        <Card className="mb-5 p-4">
          <form className="flex flex-wrap items-center gap-3" method="get">
            <input type="hidden" name="view" value="list" />
            <div className="relative min-w-48 flex-1">
              <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                defaultValue={sp.q}
                placeholder="بحث..."
                className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select name="campaignId" defaultValue={sp.campaignId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">كل الحملات</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={sp.type ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">كل الأنواع</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select name="platform" defaultValue={sp.platform ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">كل المنصات</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="">كل الحالات</option>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
              تصفية
            </button>
          </form>
        </Card>
      )}

      {view === "list" &&
        (allContent.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="لا يوجد محتوى"
            action={canEdit ? <ButtonLink href="/content/new">+ إضافة محتوى</ButtonLink> : undefined}
          />
        ) : (
          <Card className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>المحتوى</Th>
                  <Th>التاريخ</Th>
                  <Th>المنصة</Th>
                  <Th>النوع</Th>
                  <Th>الحملة</Th>
                  <Th>المسؤول</Th>
                  <Th>الحالة</Th>
                </Tr>
              </Thead>
              <Tbody>
                {allContent.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/content/${c.id}/edit`} className="font-medium text-primary hover:underline">
                        {c.title}
                      </Link>
                    </Td>
                    <Td className="text-xs text-muted">{formatDate(c.date)}</Td>
                    <Td>{c.platform}</Td>
                    <Td>{c.type}</Td>
                    <Td className="text-xs text-muted">{c.campaign?.name ?? "—"}</Td>
                    <Td>{c.assignedTo?.name ?? "—"}</Td>
                    <Td>
                      <Badge>{c.status}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        ))}

      {view === "month" && (
        <Card className="p-3 md:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getMonthGrid(anchor).map(({ date, inMonth, isToday }) => {
              const dayContent = allContent.filter((c) => isSameDay(c.date, date));
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "min-h-24 rounded-lg border border-border p-1.5 text-xs",
                    !inMonth && "opacity-40",
                    isToday && "border-primary bg-primary-soft/40"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-foreground">{date.getDate()}</span>
                    {canEdit && (
                      <Link
                        href={`/content/new?date=${formatDateInput(date)}`}
                        className="text-muted hover:text-primary"
                        aria-label="إضافة محتوى"
                      >
                        <Plus size={12} />
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayContent.slice(0, 3).map((c) => (
                      <Link
                        key={c.id}
                        href={`/content/${c.id}/edit`}
                        className="truncate rounded bg-primary-soft px-1.5 py-0.5 text-primary hover:bg-primary/20"
                        title={c.title}
                      >
                        {c.title}
                      </Link>
                    ))}
                    {dayContent.length > 3 && (
                      <span className="text-[10px] text-muted">+{dayContent.length - 3} أخرى</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "week" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {getWeekDays(anchor).map((date, i) => {
            const dayContent = allContent.filter((c) => isSameDay(c.date, date));
            return (
              <Card key={date.toISOString()} className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">{WEEKDAY_LABELS[i]}</p>
                    <p className="text-sm font-bold text-foreground">{date.getDate()}</p>
                  </div>
                  {canEdit && (
                    <Link href={`/content/new?date=${formatDateInput(date)}`} className="text-muted hover:text-primary">
                      <Plus size={14} />
                    </Link>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {dayContent.length === 0 && <p className="text-xs text-muted">لا يوجد محتوى</p>}
                  {dayContent.map((c) => (
                    <Link
                      key={c.id}
                      href={`/content/${c.id}/edit`}
                      className="block rounded-lg border border-border p-2 hover:bg-muted-surface"
                    >
                      <p className="text-xs font-medium text-foreground">{c.title}</p>
                      <p className="text-[10px] text-muted">
                        {c.platform} · {c.type}
                      </p>
                      <Badge className="mt-1">{c.status}</Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
