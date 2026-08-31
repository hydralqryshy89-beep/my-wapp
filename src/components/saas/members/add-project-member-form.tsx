"use client";

import { useActionState } from "react";
import { addProjectMemberAction } from "@/actions/saas/member.actions";
import { Field, Select } from "@/components/saas/ui/field";
import { SubmitButton } from "@/components/saas/ui/button";
import { Alert } from "@/components/saas/ui/alert";

export function AddProjectMemberForm({
  projectId,
  eligibleUsers,
  roles,
}: {
  projectId: string;
  eligibleUsers: { id: string; name: string; email: string }[];
  roles: { id: string; name: string }[];
}) {
  const action = addProjectMemberAction.bind(null, projectId);
  const [error, formAction] = useActionState(action, undefined);

  if (eligibleUsers.length === 0) {
    return <p className="text-sm text-slate-500">Every organization member is already on this project.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="Organization member" htmlFor="project-member-user" required>
          <Select id="project-member-user" name="userId" required defaultValue="">
            <option value="" disabled>
              Choose a member
            </option>
            {eligibleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="w-full sm:w-48">
        <Field label="Role" htmlFor="project-member-role" required>
          <Select id="project-member-role" name="roleId" required defaultValue="">
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
