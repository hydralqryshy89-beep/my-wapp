import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PLAN_STATUSES } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";

interface Brand {
  id: string;
  name: string;
}

interface PlanDefaults {
  name?: string;
  brandId?: string | null;
  period?: string | null;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  mainGoal?: string | null;
  description?: string | null;
  status?: string;
}

export function PlanForm({
  brands,
  defaults,
  action,
  submitLabel,
}: {
  brands: Brand[];
  defaults?: PlanDefaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="اسم الخطة" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={defaults?.name} placeholder="مثال: الخطة التسويقية — سبتمبر 2026" />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="الشركة / البراند" htmlFor="brandId">
          <Select id="brandId" name="brandId" defaultValue={defaults?.brandId ?? ""}>
            <option value="">كل البراندات</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الفترة" htmlFor="period">
          <Input id="period" name="period" defaultValue={defaults?.period ?? ""} placeholder="مثال: سبتمبر 2026" />
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="الميزانية الإجمالية (IQD)" htmlFor="budget" required>
          <Input
            id="budget"
            name="budget"
            type="number"
            min={0}
            step="1000"
            required
            defaultValue={defaults?.budget}
          />
        </Field>
        <Field label="حالة الخطة" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults?.status ?? "مخطط"}>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="الهدف الرئيسي" htmlFor="mainGoal">
        <Input id="mainGoal" name="mainGoal" defaultValue={defaults?.mainGoal ?? ""} placeholder="مثال: زيادة المبيعات بنسبة 30%" />
      </Field>

      <Field label="وصف الخطة" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <div className="flex justify-end gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
