import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { COURSE_STATUSES, COURSE_STATUS_LABELS } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";

interface InstructorOption {
  id: string;
  name: string;
}

interface Defaults {
  name?: string;
  shortDescription?: string | null;
  category?: string | null;
  instructorId?: string | null;
  startDate?: Date;
  endDate?: Date;
  days?: number;
  price?: number;
  capacity?: number;
  room?: string | null;
  status?: string;
}

export function CourseForm({
  instructors,
  defaults,
  action,
  submitLabel,
}: {
  instructors: InstructorOption[];
  defaults?: Defaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="اسم الدورة" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={defaults?.name} />
      </Field>

      <Field label="وصف مختصر" htmlFor="shortDescription">
        <Textarea id="shortDescription" name="shortDescription" defaultValue={defaults?.shortDescription ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="التصنيف" htmlFor="category">
          <Input
            id="category"
            name="category"
            list="course-category-suggestions"
            defaultValue={defaults?.category ?? ""}
            placeholder="مثال: طب الأسنان"
          />
          <datalist id="course-category-suggestions">
            <option value="طب الأسنان" />
            <option value="طب عام" />
            <option value="تمريض" />
            <option value="صيدلة" />
            <option value="أخرى" />
          </datalist>
        </Field>
        <Field label="المدرب" htmlFor="instructorId">
          <Select id="instructorId" name="instructorId" defaultValue={defaults?.instructorId ?? ""}>
            <option value="">بدون تحديد</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="تاريخ البداية" htmlFor="startDate" required>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={defaults?.startDate ? formatDateInput(defaults.startDate) : ""}
          />
        </Field>
        <Field label="تاريخ النهاية" htmlFor="endDate" required>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={defaults?.endDate ? formatDateInput(defaults.endDate) : ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Field label="عدد الأيام" htmlFor="days" required>
          <Input id="days" name="days" type="number" min={1} step="1" required defaultValue={defaults?.days ?? 1} />
        </Field>
        <Field label="السعر" htmlFor="price" required>
          <Input id="price" name="price" type="number" min={0} step="1" required defaultValue={defaults?.price ?? 0} />
        </Field>
        <Field label="عدد المقاعد" htmlFor="capacity" required>
          <Input id="capacity" name="capacity" type="number" min={0} step="1" required defaultValue={defaults?.capacity ?? 0} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="القاعة" htmlFor="room">
          <Input id="room" name="room" defaultValue={defaults?.room ?? ""} />
        </Field>
        <Field label="حالة التسجيل" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults?.status ?? "DRAFT"}>
            {COURSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COURSE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
