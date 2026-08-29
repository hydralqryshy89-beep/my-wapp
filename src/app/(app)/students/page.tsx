import Link from "next/link";
import { Plus, Users, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { requireUser, can } from "@/lib/permissions";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireUser();
  const canCreate = can(user, "students.create");

  const students = await prisma.student.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { registrations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="الطلاب"
        description="إدارة بيانات الطلاب المسجلين بالأكاديمية"
        action={
          canCreate ? (
            <ButtonLink href="/students/new">
              <Plus size={16} /> إضافة طالب
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
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            بحث
          </button>
        </form>
      </Card>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد طلاب بعد"
          description="أضف أول طالب لبدء تسجيله بالدورات."
          action={canCreate ? <ButtonLink href="/students/new">+ إضافة طالب</ButtonLink> : undefined}
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الاسم</Th>
                <Th>الهاتف</Th>
                <Th>المهنة</Th>
                <Th>الجامعة / مكان العمل</Th>
                <Th>عدد الدورات</Th>
              </Tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link href={`/students/${s.id}`} className="font-medium text-primary hover:underline">
                      {s.fullName}
                    </Link>
                  </Td>
                  <Td dir="ltr" className="text-xs text-muted">
                    {s.phone}
                  </Td>
                  <Td>{s.profession ?? "—"}</Td>
                  <Td>{s.workplace ?? "—"}</Td>
                  <Td>{s._count.registrations}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
