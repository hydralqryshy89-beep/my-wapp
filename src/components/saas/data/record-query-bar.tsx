"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/saas/ui/button";
import { Input, Select } from "@/components/saas/ui/field";
import { FILTER_OPERATORS_BY_FIELD_TYPE, FILTER_OPERATOR_LABELS, type FilterOperator } from "@/lib/saas/data-constants";

export interface FilterFieldDef {
  key: string;
  name: string;
  type: string;
  options: unknown;
}

export interface ActiveFilter {
  raw: string;
  field: string;
  operator: string;
  value: unknown;
}

const NO_VALUE_OPERATORS = new Set(["isEmpty", "isNotEmpty"]);

/** Client-side search/filter/sort controls — state lives entirely in the URL (search params), so the list stays a plain server-rendered page (section 59-61). */
export function RecordQueryBar({
  fields,
  activeFilters,
  currentSearch,
  currentSort,
  currentSortDirection,
}: {
  fields: FilterFieldDef[];
  activeFilters: ActiveFilter[];
  currentSearch?: string;
  currentSort?: string;
  currentSortDirection?: "asc" | "desc";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filterableFields = fields.filter(
    (f) => (FILTER_OPERATORS_BY_FIELD_TYPE[f.type as keyof typeof FILTER_OPERATORS_BY_FIELD_TYPE] ?? []).length > 0
  );
  const sortableFields = fields.filter((f) => f.type !== "MULTI_SELECT" && f.type !== "FILE");

  const [searchValue, setSearchValue] = useState(currentSearch ?? "");
  const [newFilterField, setNewFilterField] = useState(filterableFields[0]?.key ?? "");
  const [newFilterOperator, setNewFilterOperator] = useState<string>("");
  const [newFilterValue, setNewFilterValue] = useState("");

  const selectedField = filterableFields.find((f) => f.key === newFilterField);
  const availableOperators = selectedField
    ? (FILTER_OPERATORS_BY_FIELD_TYPE[selectedField.type as keyof typeof FILTER_OPERATORS_BY_FIELD_TYPE] ?? [])
    : [];
  // Derived at render time (not synced via effect): falls back to the first
  // valid operator whenever the selected field makes the stored one invalid.
  const effectiveOperator = availableOperators.includes(newFilterOperator as FilterOperator)
    ? newFilterOperator
    : (availableOperators[0] ?? "");

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // Debounced search — avoid firing a request per keystroke (section 59).
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue === (currentSearch ?? "")) return;
      pushParams((params) => {
        if (searchValue) params.set("search", searchValue);
        else params.delete("search");
      });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function addFilter() {
    if (!selectedField || !effectiveOperator) return;
    const needsValue = !NO_VALUE_OPERATORS.has(effectiveOperator);
    if (needsValue && !newFilterValue) return;
    const filterObj = { field: selectedField.key, operator: effectiveOperator, value: needsValue ? newFilterValue : undefined };
    pushParams((params) => params.append("filter", JSON.stringify(filterObj)));
    setNewFilterValue("");
  }

  function removeFilter(raw: string) {
    pushParams((params) => {
      const remaining = params.getAll("filter").filter((f) => f !== raw);
      params.delete("filter");
      remaining.forEach((f) => params.append("filter", f));
    });
  }

  function applySort(field: string, direction: "asc" | "desc") {
    pushParams((params) => {
      params.set("sort", field);
      params.set("dir", direction);
    });
  }

  const valueInputType =
    selectedField?.type === "NUMBER" || selectedField?.type === "CURRENCY"
      ? "number"
      : selectedField?.type === "DATE" || selectedField?.type === "DATETIME"
        ? "date"
        : "text";

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Search records..." className="max-w-xs" />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          Sort by
          <Select value={currentSort ?? "createdAt"} onChange={(e) => applySort(e.target.value, currentSortDirection ?? "desc")} className="h-9 w-auto">
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            {sortableFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select
            value={currentSortDirection ?? "desc"}
            onChange={(e) => applySort(currentSort ?? "createdAt", e.target.value as "asc" | "desc")}
            className="h-9 w-auto"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
        </div>
      </div>

      {filterableFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Select value={newFilterField} onChange={(e) => setNewFilterField(e.target.value)} className="h-9 w-auto">
            {filterableFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select value={effectiveOperator} onChange={(e) => setNewFilterOperator(e.target.value)} className="h-9 w-auto">
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {FILTER_OPERATOR_LABELS[op]}
              </option>
            ))}
          </Select>
          {!NO_VALUE_OPERATORS.has(effectiveOperator) &&
            (selectedField?.type === "SELECT" && Array.isArray(selectedField.options) ? (
              <Select value={newFilterValue} onChange={(e) => setNewFilterValue(e.target.value)} className="h-9 w-auto">
                <option value="" disabled>
                  Value
                </option>
                {(selectedField.options as string[]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={newFilterValue}
                onChange={(e) => setNewFilterValue(e.target.value)}
                type={valueInputType}
                placeholder="Value"
                className="h-9 w-40"
              />
            ))}
          <Button type="button" size="sm" variant="outline" onClick={addFilter}>
            Apply
          </Button>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => {
            const field = fields.find((x) => x.key === f.field);
            return (
              <span
                key={f.raw}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200"
              >
                {field?.name ?? f.field} {FILTER_OPERATOR_LABELS[f.operator as FilterOperator] ?? f.operator}{" "}
                {f.value !== undefined ? String(f.value) : ""}
                <button type="button" onClick={() => removeFilter(f.raw)} className="ml-1 hover:text-indigo-900" aria-label="Remove filter">
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
