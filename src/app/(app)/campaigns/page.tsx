import Link from "next/link";
import { Plus, Rocket, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCompany } from "@/lib/data/company";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; brandId?: string }>;
}) {
  const { q, status, brandId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "campaigns", "VIEW")) return <AccessDenied label="الحملات" />;
  const canEdit = can(user, "campaigns", "EDIT");
  const company = await getCompany();

  const [campaigns, brands] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        plan: { companyId: company.id },
        ...(q ? { name: { contains: q } } : {}),
        ...(status ? { status } : {}),
        ...(brandId ? { brandId } : {}),
      },
      include: { plan: true, brand: true, assignedTo: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.brand.findMany({ where: { companyId: company.id } }),
  ]);

  return (
    <div>
      <PageHeader
        title="الحملات"
        description="أدر حملاتك التسويقية عبر جميع العلامات"
        action={
          canEdit ? (
            <ButtonLink href="/campaigns/new">
              <Plus size={16} /> إنشاء حملة
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
              placeholder="بحث باسم الحملة..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select name="brandId" defaultValue={brandId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل البراندات</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل الحالات</option>
            {CAMPAIGN_STATUSES.map((s) => (
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

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="لا توجد حملات بعد"
          description="أنشئ أول حملة تسويقية لخطتك."
          action={canEdit ? <ButtonLink href="/campaigns/new">+ إنشاء حملة</ButtonLink> : undefined}
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>الحملة</Th>
                <Th>البراند</Th>
                <Th>الخطة</Th>
                <Th>الفترة</Th>
                <Th>الميزانية</Th>
                <Th>المسؤول</Th>
                <Th>الحالة</Th>
              </Tr>
            </Thead>
            <Tbody>
              {campaigns.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.brand?.name ?? "—"}</Td>
                  <Td className="text-xs text-muted">
                    <Link href={`/plans/${c.planId}`} className="hover:underline">
                      {c.plan.name}
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted">
                    {formatDate(c.startDate)} — {formatDate(c.endDate)}
                  </Td>
                  <Td>{formatCurrency(c.budget, company.currency)}</Td>
                  <Td>{c.assignedTo?.name ?? "—"}</Td>
                  <Td>
                    <Badge>{c.status}</Badge>
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
