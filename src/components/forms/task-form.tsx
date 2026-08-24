import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
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
  description?: string | null;
  assignedToId?: string | null;
  priority?: string;
  status?: string;
  dueDate?: Date | null;
}

export function TaskForm({
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
      <Field label="اسم المهمة" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={defaults?.title} />
      </Field>

      <Field label="الوصف" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ""} />
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
        <Field label="التاريخ المستحق" htmlFor="dueDate">
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults?.dueDate ? formatDateInput(defaults.dueDate) : ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="الأولوية" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue={defaults?.priority ?? "متوسطة"}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الحالة" htmlFor="status">
          <Select id="status" name="status" defaultValue={defaults?.status ?? "جديدة"}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
