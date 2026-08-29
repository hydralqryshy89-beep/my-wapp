import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Layers, Rocket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCompany } from "@/lib/data/company";
import { formatMetaCampaignStatus, formatMetaEntityStatus } from "@/lib/meta/format";
import { syncMetaAdSetsAndAds } from "@/app/actions/meta";
import { MetaCampaignSyncButton } from "@/components/campaigns/meta-campaign-sync-button";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function MetaCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "campaigns", "VIEW")) return <AccessDenied label="الحملات" />;
  const company = await getCompany();

  const campaign = await prisma.metaCampaign.findUnique({
    where: { id },
    include: {
      adAccount: { include: { brand: true, connection: true } },
      adSets: { include: { ads: true }, orderBy: { name: "asc" } },
    },
  });

  if (!campaign || campaign.adAccount.connection.companyId !== company.id) notFound();

  const currency = campaign.adAccount.currency ?? company.currency;

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={
          <>
            <Link href="/campaigns?view=meta" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ArrowRight size={14} /> حملات Meta
            </Link>
            {campaign.adAccount.brand ? ` · ${campaign.adAccount.brand.name}` : ""} · {campaign.adAccount.accountName}
          </>
        }
        action={user.isAdmin ? <MetaCampaignSyncButton action={syncMetaAdSetsAndAds.bind(null, campaign.id)} label="مزامنة المجموعات والإعلانات" pendingLabel="جاري المزامنة..." /> : undefined}
      />

      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted">معلومات الحملة</p>
          <Badge>{formatMetaCampaignStatus(campaign.status)}</Badge>
        </div>
        <p className="mb-3 font-medium text-foreground" dir="ltr">
          {campaign.objective ?? "—"}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-muted">الميزانية</p>
            <p className="text-foreground">
              {campaign.dailyBudget
                ? `${formatCurrency(campaign.dailyBudget, currency)} / يوم`
                : campaign.lifetimeBudget
                  ? formatCurrency(campaign.lifetimeBudget, currency)
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">الفترة</p>
            <p className="text-foreground">
              {campaign.startTime ? formatDate(campaign.startTime) : "—"} — {campaign.stopTime ? formatDate(campaign.stopTime) : "مستمرة"}
            </p>
          </div>
        </div>
      </Card>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Layers size={16} /> المجموعات الإعلانية ({campaign.adSets.length})
      </h2>

      {campaign.adSets.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="لا توجد مجموعات إعلانية مجلوبة بعد"
          description={user.isAdmin ? 'اضغط "مزامنة المجموعات والإعلانات" أعلاه لجلبها.' : "اطلب من مدير النظام مزامنة هذه الحملة."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {campaign.adSets.map((adSet) => (
            <Card key={adSet.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" dir="ltr">
                  {adSet.name}
                </CardTitle>
                <Badge>{formatMetaEntityStatus(adSet.status)}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">الميزانية</p>
                    <p className="text-foreground">
                      {adSet.dailyBudget
                        ? `${formatCurrency(adSet.dailyBudget, currency)} / يوم`
                        : adSet.lifetimeBudget
                          ? formatCurrency(adSet.lifetimeBudget, currency)
                          : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">الفترة</p>
                    <p className="text-foreground">
                      {adSet.startTime ? formatDate(adSet.startTime) : "—"} — {adSet.stopTime ? formatDate(adSet.stopTime) : "مستمرة"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">الاستهداف</p>
                    <p className="text-foreground" dir="ltr">
                      {adSet.targetingSummary ?? "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">الإعلانات ({adSet.ads.length})</p>
                  {adSet.ads.length === 0 ? (
                    <p className="text-xs text-muted">لا توجد إعلانات بهذه المجموعة.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {adSet.ads.map((ad) => (
                        <div key={ad.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          {ad.creativeThumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.creativeThumbnailUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted-surface text-muted">
                              <Rocket size={14} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground" dir="ltr">
                              {ad.name}
                            </p>
                            {ad.creativeName && (
                              <p className="truncate text-xs text-muted" dir="ltr">
                                {ad.creativeName}
                              </p>
                            )}
                          </div>
                          <Badge>{formatMetaEntityStatus(ad.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
