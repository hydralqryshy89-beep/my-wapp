import { Badge } from "@/components/saas/ui/badge";

interface FieldLike {
  key: string;
  type: string;
  settings?: unknown;
}

/** One formatter per field type (section 53) — used by both the record table and the record detail view. */
export function FieldValueDisplay({ field, value }: { field: FieldLike; value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-slate-300">—</span>;
  }

  switch (field.type) {
    case "BOOLEAN":
      return (
        <Badge className={value ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    case "SELECT":
      return <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">{String(value)}</Badge>;
    case "MULTI_SELECT":
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : []).map((v) => (
            <Badge key={String(v)} className="bg-indigo-50 text-indigo-700 ring-indigo-200">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    case "URL":
      return (
        <a href={String(value)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
          {String(value)}
        </a>
      );
    case "EMAIL":
      return (
        <a href={`mailto:${value}`} className="text-indigo-600 hover:underline">
          {String(value)}
        </a>
      );
    case "CURRENCY": {
      const settings = (field.settings ?? {}) as { currency?: string };
      const prefix = settings.currency ? `${settings.currency} ` : "";
      return (
        <span>
          {prefix}
          {Number(value).toLocaleString()}
        </span>
      );
    }
    case "NUMBER":
      return <span>{Number(value).toLocaleString()}</span>;
    case "DATE":
      return <span>{new Date(`${value}T00:00:00Z`).toLocaleDateString()}</span>;
    case "DATETIME":
      return <span>{new Date(String(value)).toLocaleString()}</span>;
    case "LONG_TEXT":
      return <span className="line-clamp-2">{String(value)}</span>;
    case "FILE": {
      const f = value as { url?: string; name?: string };
      return f?.url ? (
        <a href={f.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
          {f.name || f.url}
        </a>
      ) : (
        <span className="text-slate-300">—</span>
      );
    }
    default:
      return <span>{String(value)}</span>;
  }
}
