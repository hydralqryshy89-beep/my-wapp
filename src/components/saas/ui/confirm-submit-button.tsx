"use client";

import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { buttonSizes, buttonVariants, SubmitButton } from "@/components/saas/ui/button";

type ActionFn = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

/** A form guarded by a native confirm() dialog, for destructive actions (remove member, archive project). */
export function ConfirmSubmitButton({
  action,
  confirmText,
  label,
  pendingLabel,
  variant = "danger",
  size = "sm",
  className,
}: {
  action: ActionFn;
  confirmText: string;
  label: React.ReactNode;
  pendingLabel?: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
}) {
  const [error, formAction] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel} className={cn(className)}>
        {label}
      </SubmitButton>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </form>
  );
}
