import { Building2, Tags, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { CURRENCIES } from "@/lib/constants";
import { getCompany } from "@/lib/data/company";
import {
  updateCompany,
  createBrand,
  updateBrand,
  deleteBrand,
  createUser,
  updateUser,
  deleteUser,
} from "@/app/actions/settings";

export default async function SettingsPage() {
  const company = await getCompany();
  const users = await prisma.user.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="الإعدادات" description="إدارة بيانات الشركة، البراندات، وأعضاء الفريق" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={16} /> الشركة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateCompany.bind(null, company.id)} className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="اسم الشركة" htmlFor="name" required>
                <Input id="name" name="name" required defaultValue={company.name} />
              </Field>
              <Field label="رابط الشعار" htmlFor="logo">
                <Input id="logo" name="logo" defaultValue={company.logo ?? ""} placeholder="https://..." />
              </Field>
              <Field label="العملة" htmlFor="currency">
                <Select id="currency" name="currency" defaultValue={company.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="اللغة" htmlFor="language">
                <Select id="language" name="language" defaultValue={company.language}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Button type="submit">حفظ بيانات الشركة</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags size={16} /> البراندات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {company.brands.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <form action={updateBrand.bind(null, b.id)} className="flex flex-1 flex-wrap items-center gap-2">
                  <input name="name" defaultValue={b.name} required className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  <input
                    name="logo"
                    defaultValue={b.logo ?? ""}
                    placeholder="رابط الشعار (اختياري)"
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    حفظ
                  </Button>
                </form>
                <DeleteButton action={deleteBrand.bind(null, b.id)} confirmText="سيتم حذف البراند نهائياً. هل أنت متأكد؟" />
              </div>
            ))}

            <form action={createBrand.bind(null, company.id)} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
              <input name="name" required placeholder="اسم براند جديد" className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <input name="logo" placeholder="رابط الشعار (اختياري)" className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <Button type="submit" size="sm">
                + إضافة براند
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={16} /> المستخدمون
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <form action={updateUser.bind(null, u.id)} className="flex flex-1 flex-wrap items-center gap-2">
                  <input name="name" defaultValue={u.name} required className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  <input
                    name="email"
                    type="email"
                    defaultValue={u.email}
                    required
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    dir="ltr"
                  />
                  <input
                    name="role"
                    defaultValue={u.role ?? ""}
                    placeholder="الدور الوظيفي"
                    className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    حفظ
                  </Button>
                </form>
                <DeleteButton action={deleteUser.bind(null, u.id)} confirmText="سيتم حذف المستخدم. هل أنت متأكد؟" />
              </div>
            ))}

            <form action={createUser.bind(null, company.id)} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
              <input name="name" required placeholder="اسم العضو" className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <input name="email" type="email" required placeholder="البريد الإلكتروني" dir="ltr" className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <input name="role" placeholder="الدور الوظيفي" className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
              <Button type="submit" size="sm">
                + إضافة عضو
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
