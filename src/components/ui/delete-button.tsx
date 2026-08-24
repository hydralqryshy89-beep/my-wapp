"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteButton({
  action,
  confirmText = "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.",
  className,
  label,
}: {
  action: (formData: FormData) => void;
  confirmText?: string;
  className?: string;
  label?: string;
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
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-rose-50",
          className
        )}
      >
        <Trash2 size={14} />
        {label ?? "حذف"}
      </button>
    </form>
  );
}
