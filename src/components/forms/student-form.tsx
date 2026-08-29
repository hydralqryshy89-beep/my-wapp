"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PROFESSION_SUGGESTIONS } from "@/lib/constants";

type StudentAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

interface Defaults {
  fullName?: string;
  phone?: string;
  whatsapp?: string | null;
  email?: string | null;
  profession?: string | null;
  specialty?: string | null;
  workplace?: string | null;
  notes?: string | null;
}

export function StudentForm({
  action,
  defaults,
  submitLabel,
  registerCourseId,
}: {
  action: StudentAction;
  defaults?: Defaults;
  submitLabel: string;
  /** When set, saving redirects straight into registering this student in the given course (fastest workflow, spec §26). */
  registerCourseId?: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {registerCourseId && <input type="hidden" name="registerCourseId" value={registerCourseId} />}

      <Field label="الاسم الكامل" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" required defaultValue={defaults?.fullName} />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="رقم الهاتف" htmlFor="phone" required>
          <Input id="phone" name="phone" required dir="ltr" defaultValue={defaults?.phone} />
        </Field>
        <Field label="واتساب" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" dir="ltr" defaultValue={defaults?.whatsapp ?? ""} />
        </Field>
      </div>

      <Field label="البريد الإلكتروني" htmlFor="email">
        <Input id="email" name="email" type="email" dir="ltr" defaultValue={defaults?.email ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="المهنة" htmlFor="profession">
          <Input id="profession" name="profession" list="profession-suggestions" defaultValue={defaults?.profession ?? ""} />
          <datalist id="profession-suggestions">
            {PROFESSION_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="التخصص" htmlFor="specialty">
          <Input id="specialty" name="specialty" defaultValue={defaults?.specialty ?? ""} />
        </Field>
      </div>

      <Field label="الجامعة / مكان العمل" htmlFor="workplace">
        <Input id="workplace" name="workplace" defaultValue={defaults?.workplace ?? ""} />
      </Field>

      <Field label="ملاحظات" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} />
      </Field>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "جارِ الحفظ..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
