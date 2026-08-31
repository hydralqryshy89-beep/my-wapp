"use client";

import { useActionState } from "react";
import { addOrganizationMemberAction } from "@/actions/saas/member.actions";
import { Field, Input, Select } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function AddOrganizationMemberForm({
  organizationId,
  roles,
}: {
  organizationId: string;
  roles: { id: string; name: string }[];
}) {
  const action = addOrganizationMemberAction.bind(null, organizationId);
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="User email" htmlFor="member-email" required>
          <Input id="member-email" name="email" type="email" required placeholder="teammate@company.com" />
        </Field>
      </div>
      <div className="w-full sm:w-48">
        <Field label="Role" htmlFor="member-role" required>
          <Select id="member-role" name="roleId" required defaultValue="">
            <option value="" disabled>
              Choose a role
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton pendingLabel="Adding...">Add Member</SubmitButton>
      {error && (
        <div className="w-full sm:w-auto">
          <Alert>{error}</Alert>
        </div>
      )}
    </form>
  );
}
