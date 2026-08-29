import Link from "next/link";
import { Plus, ClipboardList, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { RegistrationStatusForm } from "@/components/forms/registration-status-form";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { registrationPaid, registrationRemaining } from "@/lib/calculations";
import { updateRegistrationStatus } from "@/app/actions/registrations";
import { requireUser, can } from "@/lib/permissions";

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; paidStatus?: string }>;
}) {
  const { q, status, paidStatus } = await searchParams;
  const user = await requireUser();
  const canCreate = can(user, "registrations.create");
  const canEdit = can(user, "registrations.edit");
  const settings = await getSettings();

  const registrations = await prisma.registration.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { student: { fullName: { contains: q, mode: "insensitive" as const } } },
              { course: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { student: true, course: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const filtered = registrations.filter((r) => {
    if (!paidStatus) return true;
    const remaining = registrationRemaining(r);
    return paidStatus === "paid" ? remaining === 0 : remaining > 0;
  });

  return (
    <div>
      <PageHeader
        title="التسجيلات"
        description="تسجيل الطلاب في الدورات ومتابعة حالتهم"
        action={
          canCreate ? (
            <ButtonLink href="/registrations/new">
              <Plus size={16} /> تسجيل جديد
            </ButtonLink>
          ) : undefined
        }
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="بحث بالطالب أو الدورة..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل حالات التسجيل</option>
            {REGISTRATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REGISTRATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select name="paidStatus" defaultValue={paidStatus ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل حالات الدفع</option>
            <option value="paid">مدفوع بالكامل</option>
            <option value="remaining">يوجد متبقي</option>
          </select>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد تسجيلات"
          description="سجّل أول طالب في إحدى الدورات."
          action={canCreate ? <ButtonLink href="/registrations/new">+ تسجيل جديد</ButtonLink> : undefined}
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الطالب</Th>
                <Th>الدورة</Th>
                <Th>تاريخ التسجيل</Th>
                <Th>المبلغ</Th>
                <Th>المدفوع</Th>
                <Th>المتبقي</Th>
                <Th>الحالة</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((r) => {
                const paid = registrationPaid(r);
                const remaining = registrationRemaining(r);
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/students/${r.studentId}`} className="font-medium text-primary hover:underline">
                        {r.student.fullName}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/courses/${r.courseId}`} className="hover:underline">
                        {r.course.name}
                      </Link>
                    </Td>
                    <Td className="text-xs text-muted">{formatDate(r.createdAt)}</Td>
                    <Td>{formatCurrency(r.price, settings.currency)}</Td>
                    <Td className="text-success">{formatCurrency(paid, settings.currency)}</Td>
                    <Td className={remaining > 0 ? "text-danger" : ""}>{formatCurrency(remaining, settings.currency)}</Td>
                    <Td>
                      {canEdit ? (
                        <RegistrationStatusForm action={updateRegistrationStatus.bind(null, r.id)} defaultStatus={r.status} />
                      ) : (
                        REGISTRATION_STATUS_LABELS[r.status as keyof typeof REGISTRATION_STATUS_LABELS] ?? r.status
                      )}
                    </Td>
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
