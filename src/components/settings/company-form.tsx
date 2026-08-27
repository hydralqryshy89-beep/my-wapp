"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { LogoPicker } from "@/components/settings/logo-picker";
import { CURRENCIES } from "@/lib/constants";

type CompanyAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function CompanyForm({
  action,
  defaultName,
  defaultLogo,
  defaultCurrency,
  defaultLanguage,
  canEdit,
}: {
  action: CompanyAction;
  defaultName: string;
  defaultLogo: string | null;
  defaultCurrency: string;
  defaultLanguage: string;
  canEdit: boolean;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="اسم الشركة" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={defaultName} disabled={!canEdit} />
      </Field>

      <Field label="شعار الشركة">
        <LogoPicker name="logoFile" defaultLogo={defaultLogo} disabled={!canEdit} />
      </Field>

      <Field label="العملة" htmlFor="currency">
        <Select id="currency" name="currency" defaultValue={defaultCurrency} disabled={!canEdit}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="اللغة" htmlFor="language">
        <Select id="language" name="language" defaultValue={defaultLanguage} disabled={!canEdit}>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </Select>
      </Field>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger md:col-span-2" role="alert">
          {error}
        </p>
      )}

      {canEdit && (
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "جارِ الحفظ..." : "حفظ بيانات الشركة"}
          </Button>
        </div>
      )}
    </form>
  );
}
