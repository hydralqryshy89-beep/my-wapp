import Link from "next/link";
import { Award, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { IssueCertificateButton } from "@/components/forms/issue-certificate-button";
import { formatDate } from "@/lib/format";
import { issueCertificate } from "@/app/actions/certificates";
import { requireUser, can } from "@/lib/permissions";

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; courseId?: string }>;
}) {
  const { q, courseId } = await searchParams;
  const user = await requireUser();
  const canIssue = can(user, "certificates.issue");

  const [eligible, certificates] = await Promise.all([
    prisma.registration.findMany({
      where: {
        status: { not: "CANCELLED" },
        certificate: null,
        course: { OR: [{ status: "COMPLETED" }, { endDate: { lt: new Date() } }] },
        ...(courseId ? { courseId } : {}),
      },
      include: { student: true, course: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.certificate.findMany({
      where: {
        ...(courseId ? { registration: { courseId } } : {}),
        ...(q
          ? {
              registration: {
                OR: [
                  { student: { fullName: { contains: q, mode: "insensitive" as const } } },
                  { course: { name: { contains: q, mode: "insensitive" as const } } },
                ],
              },
            }
          : {}),
      },
      include: { registration: { include: { student: true, course: true } } },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="الشهادات" description="إصدار شهادات إتمام الدورات ومتابعة الشهادات الصادرة" />

      {canIssue && eligible.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>طلاب مؤهلون لإصدار شهادة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>الطالب</Th>
                  <Th>الدورة</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {eligible.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-medium text-foreground">{r.student.fullName}</Td>
                    <Td>{r.course.name}</Td>
                    <Td>
                      <IssueCertificateButton action={issueCertificate.bind(null, r.id)} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          {courseId && <input type="hidden" name="courseId" value={courseId} />}
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
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            بحث
          </button>
        </form>
      </Card>

      {certificates.length === 0 ? (
        <EmptyState icon={Award} title="لا توجد شهادات صادرة بعد" />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>رقم الشهادة</Th>
                <Th>الطالب</Th>
                <Th>الدورة</Th>
                <Th>تاريخ الإصدار</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {certificates.map((c) => (
                <Tr key={c.id}>
                  <Td dir="ltr" className="font-mono text-xs">
                    {c.certificateNumber}
                  </Td>
                  <Td>
                    <Link href={`/students/${c.registration.studentId}`} className="font-medium text-primary hover:underline">
                      {c.registration.student.fullName}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/courses/${c.registration.courseId}`} className="hover:underline">
                      {c.registration.course.name}
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(c.issueDate)}</Td>
                  <Td>
                    <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                      عرض PDF
                    </a>
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
