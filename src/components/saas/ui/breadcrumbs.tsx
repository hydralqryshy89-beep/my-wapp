import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft size={14} className="text-slate-300 rotate-180" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-900 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
