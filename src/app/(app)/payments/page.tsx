import Link from "next/link";
import { Plus, Wallet, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { requireUser, can } from "@/lib/permissions";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string; courseId?: string; studentId?: string }>;
}) {
  const { q, date, courseId, studentId } = await searchParams;
  const user = await requireUser();
  const canCreate = can(user, "payments.create");
  const settings = await getSettings();

  const dayRange = date
    ? { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) }
    : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      ...(dayRange ? { paymentDate: dayRange } : {}),
      registration: {
        ...(courseId ? { courseId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(q
          ? {
              OR: [
                { student: { fullName: { contains: q, mode: "insensitive" as const } } },
                { course: { name: { contains: q, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
    },
    include: { registration: { include: { student: true, course: true } } },
    orderBy: { paymentDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="المدفوعات"
        description="سجل جميع الدفعات المستلمة من الطلاب"
        action={
          canCreate ? (
            <ButtonLink href={`/payments/new${courseId ? `?courseId=${courseId}` : ""}`}>
              <Plus size={16} /> تسجيل دفعة
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
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {payments.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد دفعات مسجلة" />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الطالب</Th>
                <Th>الدورة</Th>
                <Th>المبلغ</Th>
                <Th>طريقة الدفع</Th>
                <Th>التاريخ</Th>
                <Th>ملاحظات</Th>
              </Tr>
            </Thead>
            <Tbody>
              {payments.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/students/${p.registration.studentId}`} className="font-medium text-primary hover:underline">
                      {p.registration.student.fullName}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/courses/${p.registration.courseId}`} className="hover:underline">
                      {p.registration.course.name}
                    </Link>
                  </Td>
                  <Td className="font-semibold text-success">{formatCurrency(p.amount, settings.currency)}</Td>
                  <Td>
                    <Badge>{PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}</Badge>
                  </Td>
                  <Td className="text-xs text-muted">{formatDate(p.paymentDate)}</Td>
                  <Td className="text-xs text-muted">{p.notes ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
