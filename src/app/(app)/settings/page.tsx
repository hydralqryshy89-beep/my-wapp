import { Building2, Tags, Users, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { AccessDenied } from "@/components/ui/access-denied";
import { RoleForm } from "@/components/settings/role-form";
import { UserForm } from "@/components/settings/user-form";
import { CompanyForm } from "@/components/settings/company-form";
import { BrandForm } from "@/components/settings/brand-form";
import { type PermissionLevel, type PermissionResource } from "@/lib/constants";
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
            <CompanyForm
              action={updateCompany.bind(null, company.id)}
              defaultName={company.name}
              defaultLogo={company.logo}
              defaultCurrency={company.currency}
              defaultLanguage={company.language}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags size={16} /> البراندات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {company.brands.map((b) =>
              canEdit ? (
                <div key={b.id} className="flex flex-wrap items-start gap-2">
                  <div className="flex-1">
                    <BrandForm action={updateBrand.bind(null, b.id)} submitLabel="حفظ" defaultName={b.name} defaultLogo={b.logo} />
                  </div>
                  <DeleteButton action={deleteBrand.bind(null, b.id)} confirmText="سيتم حذف البراند نهائياً. هل أنت متأكد؟" />
                </div>
              ) : (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo} alt="" className="h-9 w-9 rounded-lg border border-border object-cover" />
                  ) : null}
                  <span className="text-sm font-medium text-foreground">{b.name}</span>
                </div>
              )
            )}

            {canEdit && (
              <BrandForm action={createBrand.bind(null, company.id)} submitLabel="+ إضافة براند" dashed />
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
                  <div key={u.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-3">
                    <div className="flex-1">
                      <UserForm
                        action={updateUser.bind(null, u.id)}
                        submitLabel="حفظ"
                        roles={roles}
                        defaultName={u.name}
                        defaultEmail={u.email}
                        defaultRole={u.role ?? ""}
                        defaultAccessRoleId={u.accessRoleId ?? ""}
                      />
                    </div>
                    <DeleteButton action={deleteUser.bind(null, u.id)} confirmText="سيتم حذف المستخدم. هل أنت متأكد؟" />
                  </div>
                ))}

                <UserForm action={createUser.bind(null, company.id)} submitLabel="+ إضافة عضو" roles={roles} passwordRequired dashed />
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
              {roles.map((role) => {
                const defaultPermissions = Object.fromEntries(role.permissions.map((p) => [p.resource, p.level])) as Partial<
                  Record<PermissionResource, PermissionLevel>
                >;
                return (
                  <div key={role.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                    <RoleForm
                      action={updateRole.bind(null, role.id)}
                      submitLabel="حفظ"
                      defaultName={role.name}
                      defaultIsAdmin={role.isAdmin}
                      defaultPermissions={defaultPermissions}
                    />
                    <div>
                      <DeleteButton action={deleteRole.bind(null, role.id)} confirmText="سيتم حذف هذا الدور. هل أنت متأكد؟" />
                    </div>
                  </div>
                );
              })}

              <RoleForm
                action={createRole.bind(null, company.id)}
                submitLabel="+ إضافة دور"
                namePlaceholder="اسم الدور الجديد (مثال: مسؤول حملات)"
                dashed
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
