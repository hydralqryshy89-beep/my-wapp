import { notFound } from "next/navigation";
import { Database, Plus } from "lucide-react";
import { requireSaasUser } from "@/lib/saas/current-user";
import { getDataModel } from "@/services/saas/data-model.service";
import { getDataRecords } from "@/services/saas/data-record.service";
import { hasPermission } from "@/lib/saas/authorization";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/saas/errors";
import { PageHeader } from "@/components/saas/ui/page-header";
import { Card } from "@/components/saas/ui/card";
import { EmptyState } from "@/components/saas/ui/empty-state";
import { ButtonLink } from "@/components/saas/ui/button";
import { AccessDenied } from "@/components/saas/ui/access-denied";
import { Breadcrumbs } from "@/components/saas/ui/breadcrumbs";
import { RecordTable } from "@/components/saas/data/record-table";
import { RecordQueryBar, type ActiveFilter } from "@/components/saas/data/record-query-bar";
import { RecordPagination } from "@/components/saas/data/record-pagination";
import type { QueryInput } from "@/services/saas/data-query.service";

type SearchParams = Record<string, string | string[] | undefined>;

function parseSearchParams(sp: SearchParams): QueryInput & { filters: (ActiveFilter | never)[] } {
  const search = typeof sp.search === "string" && sp.search ? sp.search : undefined;
  const rawFilters = sp.filter;
  const filterList = Array.isArray(rawFilters) ? rawFilters : rawFilters ? [rawFilters] : [];
  const filters: ActiveFilter[] = [];
  for (const raw of filterList) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.field === "string" && typeof parsed.operator === "string") {
        filters.push({ field: parsed.field, operator: parsed.operator, value: parsed.value, raw });
      }
    } catch {
      // Malformed filter param — ignore rather than 500. Real validation
      // happens in the query engine against the model's actual fields.
    }
  }
  const sortField = typeof sp.sort === "string" ? sp.sort : undefined;
  const sortDirection = sp.dir === "asc" ? ("asc" as const) : sp.dir === "desc" ? ("desc" as const) : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) : undefined;
  const pageSize = typeof sp.pageSize === "string" ? Number(sp.pageSize) : undefined;

  return { search, filters, sortField, sortDirection, page, pageSize };
}

export default async function RecordsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; modelId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { projectId, modelId } = await params;
  const sp = await searchParams;
  const user = await requireSaasUser();

  let model, access;
  try {
    ({ model, access } = await getDataModel(user.id, projectId, modelId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }

  if (!hasPermission(access.permissions, "data_record.view")) {
    return <AccessDenied message="You don't have permission to view records in this data model." />;
  }

  const query = parseSearchParams(sp);

  let result;
  try {
    result = await getDataRecords(user.id, projectId, modelId, query);
  } catch (error) {
    if (error instanceof ValidationError) return <AccessDenied message={error.message} />;
    throw error;
  }

  const canCreate = hasPermission(access.permissions, "data_record.create");
  const canDelete = hasPermission(access.permissions, "data_record.delete");

  const linkParams = new URLSearchParams();
  if (query.search) linkParams.set("search", query.search);
  for (const f of query.filters) linkParams.append("filter", f.raw);
  if (query.sortField) linkParams.set("sort", query.sortField);
  if (query.sortDirection) linkParams.set("dir", query.sortDirection);
  if (query.pageSize) linkParams.set("pageSize", String(query.pageSize));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Data", href: `/saas/projects/${projectId}/data` },
          { label: model.name, href: `/saas/projects/${projectId}/data/${modelId}` },
          { label: "Records" },
        ]}
      />
      <PageHeader
        title={`${model.icon ? model.icon + " " : ""}${model.name}`}
        description="Records"
        action={
          canCreate && (
            <ButtonLink href={`/saas/projects/${projectId}/data/${modelId}/records/new`}>
              <Plus size={16} />
              Add {model.name}
            </ButtonLink>
          )
        }
      />

      <RecordQueryBar
        fields={model.fields}
        activeFilters={query.filters}
        currentSearch={query.search}
        currentSort={query.sortField}
        currentSortDirection={query.sortDirection}
      />

      <Card>
        {result.records.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No records yet"
            description={`Add your first ${model.name.toLowerCase()} record.`}
            action={
              canCreate && (
                <ButtonLink href={`/saas/projects/${projectId}/data/${modelId}/records/new`} size="sm">
                  Add first record
                </ButtonLink>
              )
            }
          />
        ) : (
          <RecordTable projectId={projectId} modelId={modelId} fields={model.fields} records={result.records} canDelete={canDelete} />
        )}
      </Card>

      {result.records.length > 0 && (
        <RecordPagination
          basePath={`/saas/projects/${projectId}/data/${modelId}/records`}
          searchParamsString={linkParams.toString()}
          page={result.pagination.page}
          pageSize={result.pagination.pageSize}
          total={result.pagination.total}
          totalPages={result.pagination.totalPages}
        />
      )}
    </div>
  );
}
