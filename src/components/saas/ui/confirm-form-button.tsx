"use client";

import { cn } from "@/lib/utils";
import { buttonSizes, buttonVariants } from "@/components/saas/ui/button";

/** A plain form + confirm() dialog for a destructive action that redirects on success (no inline error state needed). */
export function ConfirmFormButton({
  action,
  confirmText,
  label,
  variant = "danger",
  size = "sm",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmText: string;
  label: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
      >
        {label}
      </button>
    </form>
  );
}
