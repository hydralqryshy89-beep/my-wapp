import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-muted-surface text-foreground hover:bg-border",
  outline: "border border-border bg-surface text-foreground hover:bg-muted-surface",
  ghost: "text-foreground hover:bg-muted-surface",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-11 px-5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
  );
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
