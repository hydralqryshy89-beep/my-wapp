"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { remainingSeats } from "@/lib/calculations";

interface StudentOption {
  id: string;
  fullName: string;
  phone: string;
}
interface CourseOption {
  id: string;
  name: string;
  price: number;
  capacity: number;
  activeCount: number;
}

type RegistrationAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function RegistrationForm({
  students,
  courses,
  defaultStudentId,
  defaultCourseId,
  currency,
  action,
}: {
  students: StudentOption[];
  courses: CourseOption[];
  defaultStudentId?: string;
  defaultCourseId?: string;
  currency: string;
  action: RegistrationAction;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [paidAmount, setPaidAmount] = useState(0);

  const selectedCourse = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const remaining = selectedCourse ? Math.max(0, selectedCourse.price - paidAmount) : 0;
  const seatsLeft = selectedCourse ? remainingSeats(selectedCourse.capacity, selectedCourse.activeCount) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="الطالب" htmlFor="studentId" required>
        <Select id="studentId" name="studentId" required defaultValue={defaultStudentId ?? ""}>
          <option value="" disabled>
            اختر الطالب
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} — {s.phone}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="الدورة" htmlFor="courseId" required hint={seatsLeft !== null ? `المقاعد المتبقية: ${seatsLeft}` : undefined}>
        <Select
          id="courseId"
          name="courseId"
          required
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="" disabled>
            اختر الدورة
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {selectedCourse && (
        <div className="rounded-lg bg-muted-surface p-3 text-sm">
          <span className="text-muted">سعر الدورة: </span>
          <span className="font-semibold text-foreground">{formatCurrency(selectedCourse.price, currency)}</span>
        </div>
      )}

      <Field label="المبلغ المدفوع الآن" htmlFor="paidAmount">
        <Input
          id="paidAmount"
          name="paidAmount"
          type="number"
          min={0}
          step="1"
          defaultValue={0}
          onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
        />
      </Field>

      {selectedCourse && (
        <div className="rounded-lg bg-muted-surface p-3 text-sm">
          <span className="text-muted">المتبقي: </span>
          <span className="font-semibold text-foreground">{formatCurrency(remaining, currency)}</span>
        </div>
      )}

      <Field label="حالة التسجيل" htmlFor="status">
        <Select id="status" name="status" defaultValue="CONFIRMED">
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REGISTRATION_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "جارِ الحفظ..." : "تأكيد التسجيل"}
        </Button>
      </div>
    </form>
  );
}
