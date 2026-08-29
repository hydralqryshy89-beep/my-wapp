import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { AttendanceCell } from "@/components/attendance/attendance-cell";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/permissions";

export default async function AttendanceCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requireUser();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      registrations: {
        where: { status: { not: "CANCELLED" } },
        include: { student: true, attendance: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!course || course.deletedAt) notFound();

  const days = Array.from({ length: course.days }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader title={`تسجيل الحضور — ${course.name}`} description={`${course.days} يوم تدريبي`} />

      {course.registrations.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد طلاب مسجلون في هذه الدورة" />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الطالب</Th>
                <Th>الهاتف</Th>
                {days.map((d) => (
                  <Th key={d}>اليوم {d}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {course.registrations.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-foreground">{r.student.fullName}</Td>
                  <Td dir="ltr" className="text-xs text-muted">
                    {r.student.phone}
                  </Td>
                  {days.map((d) => {
                    const record = r.attendance.find((a) => a.dayNumber === d);
                    return (
                      <Td key={d}>
                        <AttendanceCell
                          registrationId={r.id}
                          dayNumber={d}
                          courseId={course.id}
                          status={record ? (record.status === "PRESENT" ? "PRESENT" : "ABSENT") : null}
                        />
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
