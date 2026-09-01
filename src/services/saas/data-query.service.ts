import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/saas/errors";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  FILTER_OPERATORS_BY_FIELD_TYPE,
  NUMERIC_FIELD_TYPES,
  type FieldType,
} from "@/lib/saas/data-constants";
import type { DataFieldDef, RecordJson } from "@/lib/saas/record-validation";

// ----------------------------------------------------------------------------
// Query safety (AGENTS.md Phase 2B sections 27-36, 68, 74): every field/
// operator here is checked against the model's REAL fields (fetched from the
// DB by the caller, never trusted from the client) before it is used to
// build SQL. All values are bound Prisma.sql parameters — never string
// interpolation. The only raw, unparameterized fragments are ones this
// module writes itself (column names, casts, ASC/DESC), never client input.
//
// Why raw SQL at all: Prisma's high-level query builder can filter JSON by
// nested path (which we use for uniqueness checks elsewhere), but it cannot
// ORDER BY a JSON path, which dynamic-field sorting needs. Rather than run
// two divergent query paths (one native, one raw), every record list/count
// goes through this one parameterized builder for consistency.
// ----------------------------------------------------------------------------

export interface QueryFilter {
  field: string;
  operator: string;
  value?: unknown;
}

export interface QueryInput {
  search?: string;
  filters?: QueryFilter[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface QueryResult {
  records: { id: string; data: RecordJson; createdAt: Date; updatedAt: Date }[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const SEARCHABLE_TYPES: readonly string[] = ["TEXT", "LONG_TEXT", "EMAIL", "PHONE", "URL"];
// Field keys only ever come from toSnakeCaseKey() server-side (never the
// client) — this is defense in depth, not the primary safeguard.
const SAFE_KEY_RE = /^[a-z0-9_]+$/;

function assertSafeKey(key: string): void {
  if (!SAFE_KEY_RE.test(key)) throw new ValidationError("Invalid field reference.");
}

function castExpression(type: FieldType): "text" | "numeric" | "boolean" {
  if (NUMERIC_FIELD_TYPES.includes(type)) return "numeric";
  if (type === "BOOLEAN") return "boolean";
  return "text";
}

/** `(data ->> key)`, cast to the field's real type. `key` is always a bound parameter. */
function fieldValueSql(key: string, type: FieldType): Prisma.Sql {
  const extracted = Prisma.sql`(data ->> ${key})`;
  const cast = castExpression(type);
  if (cast === "numeric") return Prisma.sql`(${extracted})::numeric`;
  if (cast === "boolean") return Prisma.sql`(${extracted})::boolean`;
  return extracted;
}

function coerceFilterValue(type: FieldType, value: unknown): string | number | boolean {
  if (NUMERIC_FIELD_TYPES.includes(type)) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new ValidationError("Invalid numeric filter value.");
    return n;
  }
  if (type === "BOOLEAN") {
    if (typeof value === "boolean") return value;
    throw new ValidationError("Invalid boolean filter value.");
  }
  return String(value);
}

function buildFilterSql(field: DataFieldDef, operator: string, value: unknown): Prisma.Sql {
  const type = field.type as FieldType;
  const allowed = FILTER_OPERATORS_BY_FIELD_TYPE[type] ?? [];
  if (!allowed.includes(operator as (typeof allowed)[number])) {
    throw new ValidationError(`The "${operator}" filter isn't supported for "${field.name}".`);
  }
  assertSafeKey(field.key);

  switch (operator) {
    case "equals":
      return Prisma.sql`${fieldValueSql(field.key, type)} = ${coerceFilterValue(type, value)}`;
    case "notEquals":
      return Prisma.sql`(${fieldValueSql(field.key, type)} IS DISTINCT FROM ${coerceFilterValue(type, value)})`;
    case "contains":
      if (type === "MULTI_SELECT") {
        return Prisma.sql`(data -> ${field.key}) @> ${JSON.stringify([value])}::jsonb`;
      }
      return Prisma.sql`${fieldValueSql(field.key, type)} ILIKE ${`%${String(value)}%`}`;
    case "notContains":
      return Prisma.sql`NOT ((data -> ${field.key}) @> ${JSON.stringify([value])}::jsonb)`;
    case "startsWith":
      return Prisma.sql`${fieldValueSql(field.key, type)} ILIKE ${`${String(value)}%`}`;
    case "endsWith":
      return Prisma.sql`${fieldValueSql(field.key, type)} ILIKE ${`%${String(value)}`}`;
    case "greaterThan":
      return Prisma.sql`${fieldValueSql(field.key, type)} > ${coerceFilterValue(type, value)}`;
    case "greaterThanOrEqual":
      return Prisma.sql`${fieldValueSql(field.key, type)} >= ${coerceFilterValue(type, value)}`;
    case "lessThan":
      return Prisma.sql`${fieldValueSql(field.key, type)} < ${coerceFilterValue(type, value)}`;
    case "lessThanOrEqual":
      return Prisma.sql`${fieldValueSql(field.key, type)} <= ${coerceFilterValue(type, value)}`;
    case "before":
      return Prisma.sql`${fieldValueSql(field.key, type)} < ${String(value)}`;
    case "after":
      return Prisma.sql`${fieldValueSql(field.key, type)} > ${String(value)}`;
    case "between": {
      const [from, to] = Array.isArray(value) ? value : [undefined, undefined];
      if (typeof from !== "string" || typeof to !== "string") throw new ValidationError("Invalid date range.");
      return Prisma.sql`${fieldValueSql(field.key, type)} BETWEEN ${from} AND ${to}`;
    }
    case "isEmpty":
      return Prisma.sql`(data ->> ${field.key} IS NULL OR data ->> ${field.key} = '')`;
    case "isNotEmpty":
      return Prisma.sql`(data ->> ${field.key} IS NOT NULL AND data ->> ${field.key} <> '')`;
    case "in":
    case "notIn": {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) return operator === "in" ? Prisma.sql`FALSE` : Prisma.sql`TRUE`;
      const coerced = values.map((v) => Prisma.sql`${coerceFilterValue(type, v)}`);
      const clause = Prisma.sql`${fieldValueSql(field.key, type)} IN (${Prisma.join(coerced)})`;
      return operator === "in" ? clause : Prisma.sql`NOT (${clause})`;
    }
    default:
      throw new ValidationError(`Unsupported filter operator "${operator}".`);
  }
}

function buildSearchSql(fields: DataFieldDef[], search: string): Prisma.Sql | null {
  const searchable = fields.filter((f) => SEARCHABLE_TYPES.includes(f.type));
  if (searchable.length === 0) return null;
  const term = `%${search}%`;
  const conditions = searchable.map((f) => {
    assertSafeKey(f.key);
    return Prisma.sql`data ->> ${f.key} ILIKE ${term}`;
  });
  return Prisma.sql`(${Prisma.join(conditions, " OR ")})`;
}

function buildWhereSql(modelId: string, fieldsByKey: Map<string, DataFieldDef>, input: QueryInput): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`"modelId" = ${modelId}`];

  if (input.search && input.search.trim()) {
    const searchSql = buildSearchSql([...fieldsByKey.values()], input.search.trim());
    if (searchSql) conditions.push(searchSql);
  }

  for (const filter of input.filters ?? []) {
    const field = fieldsByKey.get(filter.field);
    if (!field) throw new ValidationError(`Unknown filter field "${filter.field}".`);
    conditions.push(buildFilterSql(field, filter.operator, filter.value));
  }

  return Prisma.join(conditions, " AND ");
}

function buildOrderBySql(
  fieldsByKey: Map<string, DataFieldDef>,
  sortField: string | undefined,
  direction: "asc" | "desc"
): Prisma.Sql {
  const dir = direction === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
  if (!sortField || sortField === "createdAt") return Prisma.sql`"createdAt" ${dir}`;
  if (sortField === "updatedAt") return Prisma.sql`"updatedAt" ${dir}`;

  const field = fieldsByKey.get(sortField);
  if (!field) throw new ValidationError(`Unknown sort field "${sortField}".`);
  if (field.type === "MULTI_SELECT" || field.type === "FILE") {
    throw new ValidationError(`Sorting by "${field.name}" isn't supported.`);
  }
  assertSafeKey(field.key);
  return Prisma.sql`${fieldValueSql(field.key, field.type as FieldType)} ${dir}`;
}

export async function queryDataRecords(modelId: string, fields: DataFieldDef[], input: QueryInput): Promise<QueryResult> {
  const fieldsByKey = new Map(fields.map((f) => [f.key, f]));
  for (const f of fields) assertSafeKey(f.key);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
  const direction: "asc" | "desc" = input.sortDirection === "asc" ? "asc" : "desc";
  const offset = (page - 1) * pageSize;

  const whereSql = buildWhereSql(modelId, fieldsByKey, input);
  const orderBySql = buildOrderBySql(fieldsByKey, input.sortField, direction);

  const rows = await prisma.$queryRaw<{ id: string; data: unknown; createdAt: Date; updatedAt: Date }[]>(
    Prisma.sql`
      SELECT id, data, "createdAt", "updatedAt"
      FROM saas_data_records
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ${pageSize} OFFSET ${offset}
    `
  );

  const total = await countDataRecords(modelId, fields, input);

  return {
    records: rows.map((r) => ({ id: r.id, data: r.data as RecordJson, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function countDataRecords(
  modelId: string,
  fields: DataFieldDef[],
  input: Pick<QueryInput, "search" | "filters"> = {}
): Promise<number> {
  const fieldsByKey = new Map(fields.map((f) => [f.key, f]));
  const whereSql = buildWhereSql(modelId, fieldsByKey, input);
  const rows = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT count(*)::bigint AS count FROM saas_data_records WHERE ${whereSql}`
  );
  return Number(rows[0]?.count ?? 0);
}
