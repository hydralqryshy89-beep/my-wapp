import Link from "next/link";
import { BookOpen, Users, ClipboardList, Wallet, TrendingDown, Calendar, AlertTriangle, ClipboardCheck } from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { getSettings } from "@/lib/data/settings";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { COURSE_STATUS_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/permissions";

export default async function DashboardPage() {
  await requireUser();
  const [data, settings] = await Promise.all([getDashboardData(), getSettings()]);
  const currency = settings.currency;

  return (
    <div>
      <PageHeader title="لوحة التحكم" description={`نظرة عامة على ${settings.academyName}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="الدورات القادمة" value={String(data.upcomingCoursesCount)} icon={BookOpen} tone="navy" />
        <StatCard label="عدد الطلاب" value={String(data.studentsCount)} icon={Users} tone="indigo" />
        <StatCard label="عدد التسجيلات" value={String(data.registrationsCount)} icon={ClipboardList} tone="teal" />
        <StatCard label="إجمالي المدفوع" value={formatCurrency(data.totalPaid, currency)} icon={Wallet} tone="emerald" />
        <StatCard label="إجمالي المتبقي" value={formatCurrency(data.totalRemaining, currency)} icon={TrendingDown} tone="burgundy" />
      </div>

      {data.alerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" /> تنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle size={14} className="shrink-0" />
                {a.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={16} /> الدورات القادمة
            </CardTitle>
            <Link href="/courses" className="text-xs font-medium text-primary hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingCourses.length === 0 ? (
              <EmptyState icon={Calendar} title="لا توجد دورات قادمة" />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingCourses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <Link href={`/courses/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {formatDate(c.startDate)} · {c.instructorName ?? "بدون مدرب"} · {c.registeredCount} مسجل · متبقي {c.seatsLeft}
                      </p>
                    </div>
                    <Badge>{COURSE_STATUS_LABELS[c.status as keyof typeof COURSE_STATUS_LABELS] ?? c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck size={16} /> آخر التسجيلات
            </CardTitle>
            <Link href="/registrations" className="text-xs font-medium text-primary hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentRegistrations.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="لا توجد تسجيلات بعد" />
            ) : (
              <ul className="divide-y divide-border">
                {data.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.studentName}</p>
                      <p className="text-xs text-muted">
                        {r.courseName} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(r.price, currency)}</p>
                      <p className={`text-xs ${r.remaining > 0 ? "text-danger" : "text-success"}`}>
                        {r.remaining > 0 ? `متبقي ${formatCurrency(r.remaining, currency)}` : "مدفوع بالكامل"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
