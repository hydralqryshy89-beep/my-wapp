"use client";

import { Unlink2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetaDisconnectButton({ action }: { action: (formData: FormData) => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("سيتم فصل اتصال Meta وحذف رمز الوصول المخزَّن. بيانات الخطة التسويقية الحالية (الحملات، الميزانية، النتائج) لن تتأثر. هل تريد المتابعة؟")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-danger hover:bg-rose-50"
        )}
      >
        <Unlink2 size={14} />
        فصل Meta
      </button>
    </form>
  );
}
