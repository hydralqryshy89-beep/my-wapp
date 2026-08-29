// Thin, typed wrapper around Meta's Graph API for server-side reads. Keeps
// the fetch/error-handling boilerplate in one place so every future phase
// (ad accounts, campaigns, ad sets, ads, insights) follows the same shape
// instead of hand-rolling fetch calls per feature.
import { META_GRAPH_API_VERSION } from "@/lib/meta/config";

export class MetaGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaGraphError";
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number };
}

// Every failure mode a raw fetch can produce — connection refused, timeout,
// a non-JSON body (an outage page, a network proxy's own error page, a
// gateway timeout), or Meta's own {error: {...}} shape — is normalized into
// a MetaGraphError here, in one place, so nothing above this layer ever
// has to deal with an unclassified exception type.
async function doFetch<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new MetaGraphError(`تعذّر الاتصال بواجهة Meta: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  let body: T & GraphErrorBody;
  try {
    body = (await res.json()) as T & GraphErrorBody;
  } catch {
    throw new MetaGraphError(`استجابة غير متوقعة من Meta (HTTP ${res.status}).`);
  }

  if (!res.ok || body.error) {
    throw new MetaGraphError(body.error?.message ?? `Meta API request failed (${res.status})`);
  }
  return body;
}

/** GET a Graph API path (e.g. "me/adaccounts") with the given query params. Never logs accessToken. */
export async function metaGraphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", accessToken);
  return doFetch<T>(url.toString());
}

interface PagedResponse<T> {
  data: T[];
  paging?: { next?: string };
}

// A hard cap on pages, not just a courtesy — without one, a single company
// with an unusually large Business Manager could turn one click into an
// unbounded number of upstream requests.
const MAX_PAGES = 10;

/** GET a paginated Graph API list, following `paging.next` up to MAX_PAGES. */
export async function metaGraphGetAllPages<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = null;
  let page = 0;

  do {
    const body: PagedResponse<T> = nextUrl
      ? await doFetch<PagedResponse<T>>(nextUrl)
      : await metaGraphGet<PagedResponse<T>>(path, accessToken, params);

    results.push(...body.data);
    nextUrl = body.paging?.next ?? null;
    page += 1;
  } while (nextUrl && page < MAX_PAGES);

  return results;
}
