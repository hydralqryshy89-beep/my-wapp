import Link from "next/link";
import { cn } from "@/lib/utils";

export function RecordPagination({
  basePath,
  searchParamsString,
  page,
  pageSize,
  total,
  totalPages,
}: {
  basePath: string;
  searchParamsString: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParamsString);
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>{total === 0 ? "No records" : `${from}–${to} of ${total}`}</span>
      <div className="flex items-center gap-2">
        <Link
          href={pageHref(Math.max(1, page - 1))}
          className={cn("rounded-lg border border-slate-300 px-3 py-1.5", page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50")}
        >
          Previous
        </Link>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <Link
          href={pageHref(Math.min(totalPages, page + 1))}
          className={cn("rounded-lg border border-slate-300 px-3 py-1.5", page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50")}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
