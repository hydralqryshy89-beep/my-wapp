import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, CalendarCheck, Wallet, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { COURSE_STATUS_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { occupancy, remainingSeats, registrationPaid, registrationRemaining, courseFinancials } from "@/lib/calculations";
import { deleteCourse } from "@/app/actions/courses";
import { requireUser, can } from "@/lib/permissions";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const canManageCourse = can(user, "courses.manage");
  const canRegister = can(user, "registrations.create");
  const settings = await getSettings();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: true,
      registrations: {
        include: { student: true, payments: true, attendance: true, certificate: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!course || course.deletedAt) notFound();

  const activeRegistrations = course.registrations.filter((r) => r.status !== "CANCELLED");
  const financials = courseFinancials(activeRegistrations);
  const occ = occupancy(activeRegistrations.length, course.capacity);
  const seatsLeft = remainingSeats(course.capacity, activeRegistrations.length);

  return (
    <div>
      <PageHeader
        title={course.name}
        description={course.category ?? undefined}
        action={
          canManageCourse ? (
            <div className="flex gap-2">
              <ButtonLink href={`/courses/${course.id}/edit`} variant="outline">
                <Pencil size={14} /> تعديل الدورة
              </ButtonLink>
              <DeleteButton
                action={deleteCourse.bind(null, course.id)}
                confirmText="سيتم إخفاء هذه الدورة من القوائم. هل أنت متأكد؟"
                className="border border-border"
                label="حذف"
              />
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {canRegister && (
          <ButtonLink href={`/registrations/new?courseId=${course.id}`} size="sm">
            <Plus size={14} /> إضافة طالب
          </ButtonLink>
        )}
        <ButtonLink href={`/attendance/${course.id}`} variant="outline" size="sm">
          <CalendarCheck size={14} /> تسجيل حضور
        </ButtonLink>
        <ButtonLink href={`/payments?courseId=${course.id}`} variant="outline" size="sm">
          <Wallet size={14} /> عرض المدفوعات
        </ButtonLink>
        <ButtonLink href={`/certificates?courseId=${course.id}`} variant="outline" size="sm">
          <Award size={14} /> الشهادات
        </ButtonLink>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted">معلومات الدورة</p>
            <Badge>{COURSE_STATUS_LABELS[course.status as keyof typeof COURSE_STATUS_LABELS] ?? course.status}</Badge>
          </div>
          <p className="mb-3 font-medium text-foreground">{course.shortDescription || "—"}</p>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted">المدرب</p>
              <p className="text-foreground">{course.instructor?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">التاريخ</p>
              <p className="text-foreground">
                {formatDate(course.startDate)} — {formatDate(course.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">المدة</p>
              <p className="text-foreground">{course.days} يوم</p>
            </div>
            <div>
              <p className="text-xs text-muted">السعر</p>
              <p className="text-foreground">{formatCurrency(course.price, settings.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">القاعة</p>
              <p className="text-foreground">{course.room ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">المقاعد</p>
              <p className="text-foreground">
                {activeRegistrations.length} / {course.capacity} (متبقي {seatsLeft})
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-2 text-xs text-muted">ملخص التسجيلات</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">عدد المسجلين</span>
              <span className="font-semibold text-foreground">{activeRegistrations.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">نسبة الإشغال</span>
              <span className="font-semibold text-foreground">{occ.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted">إجمالي القيمة</span>
              <span className="font-semibold text-foreground">{formatCurrency(financials.revenue, settings.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">إجمالي المدفوع</span>
              <span className="font-semibold text-success">{formatCurrency(financials.paid, settings.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">إجمالي المتبقي</span>
              <span className="font-semibold text-danger">{formatCurrency(financials.remaining, settings.currency)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الطلاب المسجلون</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {course.registrations.length === 0 ? (
            <EmptyState icon={Plus} title="لا يوجد طلاب مسجلون بعد" />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>الطالب</Th>
                  <Th>الهاتف</Th>
                  <Th>المبلغ</Th>
                  <Th>المدفوع</Th>
                  <Th>المتبقي</Th>
                  <Th>الحضور</Th>
                  <Th>الحالة</Th>
                  <Th>الشهادة</Th>
                </Tr>
              </Thead>
              <Tbody>
                {course.registrations.map((r) => {
                  const paid = registrationPaid(r);
                  const remaining = registrationRemaining(r);
                  const presentDays = r.attendance.filter((a) => a.status === "PRESENT").length;
                  return (
                    <Tr key={r.id}>
                      <Td>
                        <Link href={`/students/${r.studentId}`} className="font-medium text-primary hover:underline">
                          {r.student.fullName}
                        </Link>
                      </Td>
                      <Td dir="ltr" className="text-xs text-muted">
                        {r.student.phone}
                      </Td>
                      <Td>{formatCurrency(r.price, settings.currency)}</Td>
                      <Td className="text-success">{formatCurrency(paid, settings.currency)}</Td>
                      <Td className={remaining > 0 ? "text-danger" : ""}>{formatCurrency(remaining, settings.currency)}</Td>
                      <Td className="text-xs text-muted">
                        {presentDays}/{course.days}
                      </Td>
                      <Td>
                        <Badge>{REGISTRATION_STATUS_LABELS[r.status as keyof typeof REGISTRATION_STATUS_LABELS] ?? r.status}</Badge>
                      </Td>
                      <Td>
                        {r.certificate ? (
                          <a
                            href={`/api/certificates/${r.certificate.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {r.certificate.certificateNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
