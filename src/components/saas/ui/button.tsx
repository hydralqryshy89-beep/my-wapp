"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const buttonVariants = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={cn(base, buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

/** Submit button that shows a pending label while its enclosing form action is in flight. */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size} {...props}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
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
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, buttonVariants[variant], buttonSizes[size], className)}>
      {children}
    </Link>
  );
}
