"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/saas/ui/button";

export default function SaasAppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle size={22} />
      </div>
      <div>
        <p className="font-semibold text-slate-900">Something went wrong</p>
        <p className="mt-1 max-w-md px-4 text-sm text-slate-500">Please try again.</p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
