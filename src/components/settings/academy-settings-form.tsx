"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { LogoPicker } from "@/components/settings/logo-picker";
import { CURRENCIES } from "@/lib/constants";

type SettingsAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function AcademySettingsForm({
  action,
  defaultAcademyName,
  defaultLogo,
  defaultPhone,
  defaultEmail,
  defaultAddress,
  defaultInstagram,
  defaultFacebook,
  defaultCurrency,
}: {
  action: SettingsAction;
  defaultAcademyName: string;
  defaultLogo: string | null;
  defaultPhone: string | null;
  defaultEmail: string | null;
  defaultAddress: string | null;
  defaultInstagram: string | null;
  defaultFacebook: string | null;
  defaultCurrency: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="اسم الأكاديمية" htmlFor="academyName" required>
        <Input id="academyName" name="academyName" required defaultValue={defaultAcademyName} />
      </Field>

      <Field label="شعار الأكاديمية">
        <LogoPicker name="logoFile" defaultLogo={defaultLogo} />
      </Field>

      <Field label="رقم الهاتف" htmlFor="phone">
        <Input id="phone" name="phone" dir="ltr" defaultValue={defaultPhone ?? ""} />
      </Field>

      <Field label="البريد الإلكتروني" htmlFor="email">
        <Input id="email" name="email" type="email" dir="ltr" defaultValue={defaultEmail ?? ""} />
      </Field>

      <Field label="العنوان" htmlFor="address">
        <Input id="address" name="address" defaultValue={defaultAddress ?? ""} />
      </Field>

      <Field label="العملة" htmlFor="currency">
        <Select id="currency" name="currency" defaultValue={defaultCurrency}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Instagram" htmlFor="instagram">
        <Input id="instagram" name="instagram" dir="ltr" defaultValue={defaultInstagram ?? ""} />
      </Field>

      <Field label="Facebook" htmlFor="facebook">
        <Input id="facebook" name="facebook" dir="ltr" defaultValue={defaultFacebook ?? ""} />
      </Field>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger md:col-span-2" role="alert">
          {error}
        </p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "جارِ الحفظ..." : "حفظ بيانات الأكاديمية"}
        </Button>
      </div>
    </form>
  );
}
