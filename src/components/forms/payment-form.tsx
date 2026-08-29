"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateInput } from "@/lib/format";

interface RegistrationOption {
  id: string;
  studentName: string;
  courseName: string;
  remaining: number;
}

type PaymentAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function PaymentForm({
  registrations,
  defaultRegistrationId,
  currency,
  action,
}: {
  registrations: RegistrationOption[];
  defaultRegistrationId?: string;
  currency: string;
  action: PaymentAction;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);
  const [registrationId, setRegistrationId] = useState(defaultRegistrationId ?? "");

  const selected = useMemo(
    () => registrations.find((r) => r.id === registrationId),
    [registrations, registrationId]
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="تسجيل الطالب" htmlFor="registrationId" required>
        <Select
          id="registrationId"
          name="registrationId"
          required
          value={registrationId}
          onChange={(e) => setRegistrationId(e.target.value)}
        >
          <option value="" disabled>
            اختر الطالب والدورة
          </option>
          {registrations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.studentName} — {r.courseName}
            </option>
          ))}
        </Select>
      </Field>

      {selected && (
        <div className="rounded-lg bg-muted-surface p-3 text-sm">
          <span className="text-muted">المتبقي حالياً: </span>
          <span className="font-semibold text-foreground">{formatCurrency(selected.remaining, currency)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="المبلغ" htmlFor="amount" required>
          <Input id="amount" name="amount" type="number" min={1} step="1" required />
        </Field>
        <Field label="تاريخ الدفع" htmlFor="paymentDate" required>
          <Input id="paymentDate" name="paymentDate" type="date" required defaultValue={formatDateInput(new Date())} />
        </Field>
      </div>

      <Field label="طريقة الدفع" htmlFor="method">
        <Select id="method" name="method" defaultValue="CASH">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="ملاحظات" htmlFor="notes">
        <Textarea id="notes" name="notes" />
      </Field>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "جارِ الحفظ..." : "تسجيل الدفعة"}
        </Button>
      </div>
    </form>
  );
}
