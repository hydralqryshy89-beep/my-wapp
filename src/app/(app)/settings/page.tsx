import { Building2, Tags, Users, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { AccessDenied } from "@/components/ui/access-denied";
import { CURRENCIES, PERMISSION_RESOURCES, PERMISSION_RESOURCE_LABELS, PERMISSION_LEVELS, PERMISSION_LEVEL_LABELS } from "@/lib/constants";
import { getCompany } from "@/lib/data/company";
import { requireUser, can } from "@/lib/permissions";
import {
  updateCompany,
  createBrand,
  updateBrand,
  deleteBrand,
  createUser,
  updateUser,
  deleteUser,
} from "@/app/actions/settings";
import { createRole, updateRole, deleteRole } from "@/app/actions/roles";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!can(user, "settings", "VIEW")) return <AccessDenied label="الإعدادات" />;
  const canEdit = can(user, "settings", "EDIT");

  const company = await getCompany();
  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { companyId: company.id }, include: { accessRole: true }, orderBy: { name: "asc" } }),
    user.isAdmin
      ? prisma.role.findMany({ where: { companyId: company.id }, include: { permissions: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

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
                <Input id="name" name="name" required defaultValue={company.name} disabled={!canEdit} />
              </Field>
              <Field label="رابط الشعار" htmlFor="logo">
                <Input id="logo" name="logo" defaultValue={company.logo ?? ""} placeholder="https://..." disabled={!canEdit} />
              </Field>
              <Field label="العملة" htmlFor="currency">
                <Select id="currency" name="currency" defaultValue={company.currency} disabled={!canEdit}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="اللغة" htmlFor="language">
                <Select id="language" name="language" defaultValue={company.language} disabled={!canEdit}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              {canEdit && (
                <div className="md:col-span-2">
                  <Button type="submit">حفظ بيانات الشركة</Button>
                </div>
              )}
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
                  <input
                    name="name"
                    defaultValue={b.name}
                    required
                    disabled={!canEdit}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
                  />
                  <input
                    name="logo"
                    defaultValue={b.logo ?? ""}
                    placeholder="رابط الشعار (اختياري)"
                    disabled={!canEdit}
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
                  />
                  {canEdit && (
                    <Button type="submit" size="sm" variant="outline">
                      حفظ
                    </Button>
                  )}
                </form>
                {canEdit && (
                  <DeleteButton action={deleteBrand.bind(null, b.id)} confirmText="سيتم حذف البراند نهائياً. هل أنت متأكد؟" />
                )}
              </div>
            ))}

            {canEdit && (
              <form action={createBrand.bind(null, company.id)} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
                <input name="name" required placeholder="اسم براند جديد" className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                <input name="logo" placeholder="رابط الشعار (اختياري)" className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                <Button type="submit" size="sm">
                  + إضافة براند
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={16} /> المستخدمون
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!user.isAdmin ? (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {u.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted">{u.accessRole?.name ?? "بدون دور"}</span>
                  </div>
                ))}
                <p className="text-xs text-muted">إدارة الأعضاء وكلمات المرور والأدوار متاحة فقط لمدير النظام.</p>
              </div>
            ) : (
              <>
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
                        placeholder="المسمى الوظيفي"
                        className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      />
                      <select
                        name="accessRoleId"
                        defaultValue={u.accessRoleId ?? ""}
                        className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <option value="">بدون صلاحيات (بدون دخول فعّال)</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="password"
                        type="password"
                        placeholder="كلمة مرور جديدة (اتركه فارغاً لعدم التغيير)"
                        dir="ltr"
                        className="min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
                  <input name="role" placeholder="المسمى الوظيفي" className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                  <select name="accessRoleId" defaultValue="" className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <option value="">بدون صلاحيات (بدون دخول فعّال)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="كلمة مرور (8 أحرف على الأقل)"
                    dir="ltr"
                    className="min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <Button type="submit" size="sm">
                    + إضافة عضو
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {user.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck size={16} /> الأدوار والصلاحيات
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                لكل دور صلاحية مستقلة لكل قسم من النظام (بدون وصول / عرض فقط / عرض وتعديل). دور «مدير النظام» يملك وصولاً
                كاملاً لكل شي بغض النظر عن الجدول أدناه.
              </p>
              {roles.map((role) => (
                <div key={role.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                  <form action={updateRole.bind(null, role.id)} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        name="name"
                        defaultValue={role.name}
                        required
                        className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        <input type="checkbox" name="isAdmin" defaultChecked={role.isAdmin} className="h-4 w-4 rounded border-border" />
                        مدير النظام (وصول كامل)
                      </label>
                      <Button type="submit" size="sm" variant="outline">
                        حفظ
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {PERMISSION_RESOURCES.map((resource) => {
                        const current = role.permissions.find((p) => p.resource === resource)?.level ?? "NONE";
                        return (
                          <label key={resource} className="flex flex-col gap-1 text-xs">
                            <span className="text-muted">{PERMISSION_RESOURCE_LABELS[resource]}</span>
                            <select
                              name={`perm_${resource}`}
                              defaultValue={current}
                              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                            >
                              {PERMISSION_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                  {PERMISSION_LEVEL_LABELS[level]}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                  </form>
                  <div>
                    <DeleteButton action={deleteRole.bind(null, role.id)} confirmText="سيتم حذف هذا الدور. هل أنت متأكد؟" />
                  </div>
                </div>
              ))}

              <form
                action={createRole.bind(null, company.id)}
                className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    name="name"
                    required
                    placeholder="اسم الدور الجديد (مثال: مسؤول حملات)"
                    className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" name="isAdmin" className="h-4 w-4 rounded border-border" />
                    مدير النظام (وصول كامل)
                  </label>
                  <Button type="submit" size="sm">
                    + إضافة دور
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PERMISSION_RESOURCES.map((resource) => (
                    <label key={resource} className="flex flex-col gap-1 text-xs">
                      <span className="text-muted">{PERMISSION_RESOURCE_LABELS[resource]}</span>
                      <select name={`perm_${resource}`} defaultValue="NONE" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs">
                        {PERMISSION_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {PERMISSION_LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
