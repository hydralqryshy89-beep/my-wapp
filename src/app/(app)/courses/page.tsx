import Link from "next/link";
import { Plus, BookOpen, Search, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { InstructorForm } from "@/components/forms/instructor-form";
import { formatDate, formatCurrency } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { COURSE_STATUSES, COURSE_STATUS_LABELS } from "@/lib/constants";
import { remainingSeats } from "@/lib/calculations";
import { requireUser, can } from "@/lib/permissions";
import { createInstructor, updateInstructor, deleteInstructor } from "@/app/actions/instructors";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const user = await requireUser();
  const canManage = can(user, "courses.manage");
  const settings = await getSettings();

  const [courses, instructors] = await Promise.all([
    prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(status ? { status } : {}),
      },
      include: { instructor: true, registrations: { where: { status: { not: "CANCELLED" } } } },
      orderBy: { startDate: "desc" },
    }),
    canManage
      ? prisma.instructor.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="الدورات"
        description="إدارة الدورات التدريبية الحضورية"
        action={
          canManage ? (
            <ButtonLink href="/courses/new">
              <Plus size={16} /> إضافة دورة
            </ButtonLink>
          ) : undefined
        }
      />

      {canManage && (
        <Card className="mb-5">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <GraduationCap size={16} />
            <h3 className="text-sm font-bold text-foreground">المدربون</h3>
          </div>
          <div className="flex flex-col gap-3 p-5">
            {instructors.map((i) => (
              <div key={i.id} className="flex flex-wrap items-start gap-2">
                <div className="flex-1">
                  <InstructorForm
                    action={updateInstructor.bind(null, i.id)}
                    submitLabel="حفظ"
                    defaultName={i.name}
                    defaultPhone={i.phone ?? ""}
                    defaultSpecialty={i.specialty ?? ""}
                  />
                </div>
                <DeleteButton action={deleteInstructor.bind(null, i.id)} confirmText="سيتم إخفاء هذا المدرب. هل أنت متأكد؟" />
              </div>
            ))}
            <InstructorForm action={createInstructor} submitLabel="+ إضافة مدرب" dashed />
          </div>
        </Card>
      )}

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="بحث باسم الدورة..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل الحالات</option>
            {COURSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COURSE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="لا توجد دورات بعد"
          description="أنشئ أول دورة تدريبية للأكاديمية."
          action={canManage ? <ButtonLink href="/courses/new">+ إضافة دورة</ButtonLink> : undefined}
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الدورة</Th>
                <Th>المدرب</Th>
                <Th>التاريخ</Th>
                <Th>السعر</Th>
                <Th>المسجلون</Th>
                <Th>المقاعد المتبقية</Th>
                <Th>الحالة</Th>
              </Tr>
            </Thead>
            <Tbody>
              {courses.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/courses/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.instructor?.name ?? "—"}</Td>
                  <Td className="text-xs text-muted">
                    {formatDate(c.startDate)} — {formatDate(c.endDate)}
                  </Td>
                  <Td>{formatCurrency(c.price, settings.currency)}</Td>
                  <Td>{c.registrations.length}</Td>
                  <Td>{remainingSeats(c.capacity, c.registrations.length)}</Td>
                  <Td>
                    <Badge>{COURSE_STATUS_LABELS[c.status as keyof typeof COURSE_STATUS_LABELS] ?? c.status}</Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
