import { cn } from "@/lib/utils";
import { STATUS_BADGE_STYLES, PRIORITY_BADGE_STYLES } from "@/lib/constants";

export function Badge({
  children,
  className,
  variant,
}: {
  children: string;
  className?: string;
  variant?: "status" | "priority";
}) {
  const style =
    variant === "priority"
      ? PRIORITY_BADGE_STYLES[children]
      : STATUS_BADGE_STYLES[children];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        style ?? "bg-slate-100 text-slate-700 ring-slate-200",
        className
      )}
    >
      {children}
    </span>
  );
}
