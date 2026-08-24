import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_STATUSES, PLATFORMS } from "@/lib/constants";
import { formatDateInput } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
}
interface Brand {
  id: string;
  name: string;
}
interface UserOption {
  id: string;
  name: string;
}

interface Defaults {
  planId?: string;
  brandId?: string | null;
  name?: string;
  objective?: string | null;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  platforms?: string;
  audience?: string | null;
  assignedToId?: string | null;
  status?: string;
}

export function CampaignForm({
  plans,
  brands,
  users,
  defaults,
  action,
  submitLabel,
}: {
  plans: Plan[];
  brands: Brand[];
  users: UserOption[];
  defaults?: Defaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const selectedPlatforms = defaults?.platforms ? defaults.platforms.split(",") : [];

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="اسم الحملة" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={defaults?.name} />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="الخطة المرتبطة" htmlFor="planId" required>
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
        <Field label="البراند" htmlFor="brandId">
          <Select id="brandId" name="brandId" defaultValue={defaults?.brandId ?? ""}>
            <option value="">بدون براند محدد</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="الهدف" htmlFor="objective">
        <Input id="objective" name="objective" defaultValue={defaults?.objective ?? ""} placeholder="هدف الحملة" />
      </Field>

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
        <Field label="الميزانية (IQD)" htmlFor="budget" required>
          <Input id="budget" name="budget" type="number" min={0} step="1000" required defaultValue={defaults?.budget} />
        </Field>
        <Field label="الحالة" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults?.status ?? "مخطط"}>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="المنصات">
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input type="checkbox" name="platforms" value={p} defaultChecked={selectedPlatforms.includes(p)} />
              {p}
            </label>
          ))}
        </div>
      </Field>

      <Field label="الجمهور المستهدف" htmlFor="audience">
        <Textarea id="audience" name="audience" defaultValue={defaults?.audience ?? ""} />
      </Field>

      <Field label="المسؤول" htmlFor="assignedToId">
        <Select id="assignedToId" name="assignedToId" defaultValue={defaults?.assignedToId ?? ""}>
          <option value="">غير محدد</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
