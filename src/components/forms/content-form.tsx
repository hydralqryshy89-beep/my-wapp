import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CONTENT_TYPES, CONTENT_STATUSES, PLATFORMS } from "@/lib/constants";
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
interface UserOption {
  id: string;
  name: string;
}

interface Defaults {
  planId?: string;
  campaignId?: string | null;
  title?: string;
  type?: string;
  platform?: string;
  date?: Date;
  assignedToId?: string | null;
  status?: string;
}

export function ContentForm({
  plans,
  campaigns,
  users,
  defaults,
  action,
  submitLabel,
}: {
  plans: Plan[];
  campaigns: Campaign[];
  users: UserOption[];
  defaults?: Defaults;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="اسم المحتوى" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={defaults?.title} />
      </Field>

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
        <Field label="التاريخ" htmlFor="date" required>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaults?.date ? formatDateInput(defaults.date) : ""}
          />
        </Field>
        <Field label="المنصة" htmlFor="platform" required>
          <Select id="platform" name="platform" required defaultValue={defaults?.platform ?? ""}>
            <option value="" disabled>
              اختر المنصة
            </option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="نوع المحتوى" htmlFor="type" required>
          <Select id="type" name="type" required defaultValue={defaults?.type ?? ""}>
            <option value="" disabled>
              اختر النوع
            </option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الحالة" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults?.status ?? "فكرة"}>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

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
