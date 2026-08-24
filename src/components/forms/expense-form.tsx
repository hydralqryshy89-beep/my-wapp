import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
}
interface Campaign {
  id: string;
  name: string;
  planId: string;
}

interface Defaults {
  planId?: string;
  campaignId?: string | null;
  category?: string;
  description?: string | null;
  amount?: number;
  date?: Date;
}

export function ExpenseForm({
  plans,
  campaigns,
  defaults,
  action,
  submitLabel,
}: {
  plans: Plan[];
  campaigns: Campaign[];
  defaults?: Defaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="الخطة" htmlFor="planId" required>
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
        <Field label="الحملة" htmlFor="campaignId">
          <Select id="campaignId" name="campaignId" defaultValue={defaults?.campaignId ?? ""}>
            <option value="">بدون حملة محددة</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="التصنيف" htmlFor="category" required>
          <Select id="category" name="category" required defaultValue={defaults?.category ?? ""}>
            <option value="" disabled>
              اختر التصنيف
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="التاريخ" htmlFor="date" required>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaults?.date ? formatDateInput(defaults.date) : ""}
          />
        </Field>
      </div>

      <Field label="المبلغ (IQD)" htmlFor="amount" required>
        <Input id="amount" name="amount" type="number" min={0} step="1000" required defaultValue={defaults?.amount} />
      </Field>

      <Field label="الوصف" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
