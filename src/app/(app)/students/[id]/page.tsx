import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Award, BookOpen } from "lucide-react";
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
import { REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { registrationPaid, registrationRemaining } from "@/lib/calculations";
import { deleteStudent } from "@/app/actions/students";
import { requireUser, can } from "@/lib/permissions";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = can(user, "students.edit");
  const canDelete = can(user, "students.delete");
  const settings = await getSettings();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { course: true, payments: true, attendance: true, certificate: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student || student.deletedAt) notFound();

  const totalPaid = student.registrations.reduce((sum, r) => sum + registrationPaid(r), 0);
  const totalRemaining = student.registrations.reduce((sum, r) => sum + registrationRemaining(r), 0);
  const certificates = student.registrations.filter((r) => r.certificate);

  return (
    <div>
      <PageHeader
        title={student.fullName}
        description={student.profession ?? undefined}
        action={
          <div className="flex gap-2">
            {canEdit && (
              <ButtonLink href={`/students/${student.id}/edit`} variant="outline">
                <Pencil size={14} /> تعديل
              </ButtonLink>
            )}
            {canDelete && (
              <DeleteButton
                action={deleteStudent.bind(null, student.id)}
                confirmText="سيتم إخفاء هذا الطالب من القوائم. هل أنت متأكد؟"
                className="border border-border"
              />
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="mb-3 text-xs text-muted">المعلومات الشخصية</p>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted">الهاتف</p>
              <p className="text-foreground" dir="ltr">
                {student.phone}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">واتساب</p>
              <p className="text-foreground" dir="ltr">
                {student.whatsapp ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">البريد الإلكتروني</p>
              <p className="text-foreground" dir="ltr">
                {student.email ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">المهنة</p>
              <p className="text-foreground">{student.profession ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">التخصص</p>
              <p className="text-foreground">{student.specialty ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">الجامعة / مكان العمل</p>
              <p className="text-foreground">{student.workplace ?? "—"}</p>
            </div>
          </div>
          {student.notes && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-muted">ملاحظات</p>
              <p className="text-sm text-foreground">{student.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-2 text-xs text-muted">الملخص المالي</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">إجمالي المدفوع</span>
              <span className="font-semibold text-success">{formatCurrency(totalPaid, settings.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">إجمالي المتبقي</span>
              <span className="font-semibold text-danger">{formatCurrency(totalRemaining, settings.currency)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen size={16} /> سجل الدورات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {student.registrations.length === 0 ? (
            <EmptyState icon={BookOpen} title="لم يسجل الطالب في أي دورة بعد" />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>الدورة</Th>
                  <Th>التاريخ</Th>
                  <Th>السعر</Th>
                  <Th>المدفوع</Th>
                  <Th>المتبقي</Th>
                  <Th>الحضور</Th>
                  <Th>الحالة</Th>
                  <Th>الشهادة</Th>
                </Tr>
              </Thead>
              <Tbody>
                {student.registrations.map((r) => {
                  const paid = registrationPaid(r);
                  const remaining = registrationRemaining(r);
                  const presentDays = r.attendance.filter((a) => a.status === "PRESENT").length;
                  return (
                    <Tr key={r.id}>
                      <Td>
                        <Link href={`/courses/${r.courseId}`} className="font-medium text-primary hover:underline">
                          {r.course.name}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted">{formatDate(r.course.startDate)}</Td>
                      <Td>{formatCurrency(r.price, settings.currency)}</Td>
                      <Td className="text-success">{formatCurrency(paid, settings.currency)}</Td>
                      <Td className={remaining > 0 ? "text-danger" : ""}>{formatCurrency(remaining, settings.currency)}</Td>
                      <Td className="text-xs text-muted">
                        {presentDays}/{r.course.days}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award size={16} /> الشهادات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {certificates.length === 0 ? (
            <EmptyState icon={Award} title="لا توجد شهادات صادرة بعد" />
          ) : (
            <ul className="divide-y divide-border">
              {certificates.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.course.name}</p>
                    <p className="text-xs text-muted">
                      {r.certificate!.certificateNumber} · {formatDate(r.certificate!.issueDate)}
                    </p>
                  </div>
                  <a
                    href={`/api/certificates/${r.certificate!.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    عرض PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
