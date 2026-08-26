"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={22} />
      </div>
      <div>
        <p className="font-semibold text-foreground">تعذّر إتمام العملية</p>
        <p className="mt-1 max-w-md px-4 text-sm text-muted">{error.message || "حدث خطأ غير متوقع. حاول مرة أخرى."}</p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        حاول مرة أخرى
      </Button>
    </div>
  );
}
