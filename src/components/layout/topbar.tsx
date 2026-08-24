import { getCompany } from "@/lib/data/company";

export async function Topbar() {
  const company = await getCompany();
  const today = new Intl.DateTimeFormat("ar-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 md:flex">
      <div>
        <div className="text-sm font-semibold text-foreground">{company.name}</div>
        <div className="text-xs text-muted">{today}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {company.name.slice(0, 1)}
        </div>
      </div>
    </header>
  );
}
