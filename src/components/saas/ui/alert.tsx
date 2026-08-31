import { cn } from "@/lib/utils";

export function Alert({ children, variant = "error" }: { children: React.ReactNode; variant?: "error" | "success" }) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        variant === "error" && "bg-rose-50 text-rose-700",
        variant === "success" && "bg-emerald-50 text-emerald-700"
      )}
    >
      {children}
    </p>
  );
}
