import { Building2, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { AcademySettingsForm } from "@/components/settings/academy-settings-form";
import { UserForm } from "@/components/settings/user-form";
import { getSettings } from "@/lib/data/settings";
import { updateSettings, createUser, updateUser, deleteUser } from "@/app/actions/settings";
import { requireAdmin } from "@/lib/permissions";

export default async function SettingsPage() {
  const user = await requireAdmin();
  const [settings, users] = await Promise.all([getSettings(), prisma.user.findMany({ orderBy: { name: "asc" } })]);

  return (
    <div>
      <PageHeader title="الإعدادات" description="إدارة بيانات الأكاديمية والمستخدمين" />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={16} /> بيانات الأكاديمية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcademySettingsForm
              action={updateSettings.bind(null, settings.id)}
              defaultAcademyName={settings.academyName}
              defaultLogo={settings.logo}
              defaultPhone={settings.phone}
              defaultEmail={settings.email}
              defaultAddress={settings.address}
              defaultInstagram={settings.instagram}
              defaultFacebook={settings.facebook}
              defaultCurrency={settings.currency}
            />
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
              <div key={u.id} className="flex flex-wrap items-start gap-2">
                <div className="flex-1">
                  <UserForm
                    action={updateUser.bind(null, u.id)}
                    submitLabel="حفظ"
                    defaultName={u.name}
                    defaultEmail={u.email}
                    defaultRole={u.role}
                    defaultAvatar={u.avatar}
                  />
                </div>
                {u.id !== user.id && (
                  <DeleteButton action={deleteUser.bind(null, u.id)} confirmText="سيتم حذف هذا المستخدم نهائياً. هل أنت متأكد؟" />
                )}
              </div>
            ))}

            <UserForm action={createUser} submitLabel="+ إضافة عضو" passwordRequired dashed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
