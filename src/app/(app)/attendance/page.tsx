import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { COURSE_STATUS_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/permissions";

export default async function AttendanceCoursesPage() {
  await requireUser();

  const courses = await prisma.course.findMany({
    where: { deletedAt: null, status: { in: ["OPEN", "FULL", "COMPLETED"] } },
    include: { _count: { select: { registrations: true } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader title="الحضور" description="اختر دورة لتسجيل حضور طلابها" />

      {courses.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="لا توجد دورات لتسجيل الحضور" />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الدورة</Th>
                <Th>التاريخ</Th>
                <Th>عدد الأيام</Th>
                <Th>عدد المسجلين</Th>
                <Th>الحالة</Th>
              </Tr>
            </Thead>
            <Tbody>
              {courses.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/attendance/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(c.startDate)}</Td>
                  <Td>{c.days}</Td>
                  <Td>{c._count.registrations}</Td>
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
