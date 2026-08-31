"use client";

import { useActionState, useRef } from "react";
import { Select } from "@/components/saas/ui/field";

type ActionFn = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

/** A <select> that submits its enclosing form immediately on change — used for inline role changes. */
export function RoleSelect({
  action,
  memberId,
  currentRoleId,
  roles,
  disabled,
}: {
  action: ActionFn;
  memberId: string;
  currentRoleId: string;
  roles: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [error, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={formAction} ref={formRef} className="inline-flex flex-col gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      <Select
        name="roleId"
        defaultValue={currentRoleId}
        disabled={disabled}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-auto py-0 text-xs"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </form>
  );
}
