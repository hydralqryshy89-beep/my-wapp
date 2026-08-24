import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  barClassName,
  size = "md",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const color =
    clamped >= 90
      ? "bg-danger"
      : clamped >= 70
        ? "bg-warning"
        : "bg-primary";

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted-surface",
        size === "sm" ? "h-1.5" : "h-2.5",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", color, barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
