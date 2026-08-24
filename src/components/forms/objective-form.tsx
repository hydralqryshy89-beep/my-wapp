import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { KPI_TYPES } from "@/lib/constants";

interface Plan {
  id: string;
  name: string;
}

interface Defaults {
  planId?: string;
  name?: string;
  description?: string | null;
  kpiType?: string;
  target?: number;
  current?: number;
  unit?: string | null;
}

export function ObjectiveForm({
  plans,
  defaults,
  action,
  submitLabel,
}: {
  plans: Plan[];
  defaults?: Defaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="الخطة التسويقية" htmlFor="planId" required>
        <Select id="planId" name="planId" required defaultValue={defaults?.planId ?? ""}>
          <option value="" disabled>
            اختر الخطة
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="اسم الهدف" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={defaults?.name} placeholder="مثال: زيادة Leads بنسبة 40%" />
      </Field>

      <Field label="وصف الهدف" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <Field label="نوع KPI" htmlFor="kpiType" required>
        <Select id="kpiType" name="kpiType" required defaultValue={defaults?.kpiType ?? ""}>
          <option value="" disabled>
            اختر النوع
          </option>
          {KPI_TYPES.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Field label="Target" htmlFor="target" required>
          <Input id="target" name="target" type="number" step="0.1" required defaultValue={defaults?.target} />
        </Field>
        <Field label="Current" htmlFor="current">
          <Input id="current" name="current" type="number" step="0.1" defaultValue={defaults?.current ?? 0} />
        </Field>
        <Field label="الوحدة" htmlFor="unit">
          <Input id="unit" name="unit" defaultValue={defaults?.unit ?? ""} placeholder="%، Lead، IQD..." />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
