// Phase 6: scheduled automatic sync, triggered by Vercel Cron (see
// vercel.json). This is the ONLY entry point that doesn't go through the
// admin-session-based Server Actions in src/app/actions/meta.ts — there is
// no browser session on a cron invocation, so it authenticates itself via
// CRON_SECRET instead (Vercel sends this automatically as a Bearer token
// when the env var is set on the project — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
//
// Scope, deliberately narrower than what a human can trigger by hand:
// ad accounts → campaigns → insights, for every connected company, in that
// order (each stage's data feeds the next). Ad sets/ads (Phase 4) are NOT
// synced automatically — a large Business Manager can have many campaigns
// × ad sets, and syncMetaAdSetsAndAds is intentionally scoped to one
// campaign per click for that reason; running it unattended for every
// campaign on a schedule would remove that safety valve. Ad sets/ads stay
// on-demand, from each campaign's own detail page.
//
// One company's connection failing (expired token, Meta API error) never
// stops the others — every connection gets its own isolated attempt, with
// its own outcome recorded on its own MetaConnection.lastError.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdAccounts, syncCampaigns, syncInsights, type SyncOutcome } from "@/lib/meta/sync";

export const maxDuration = 60;

interface ConnectionRunResult {
  connectionId: string;
  adAccounts: SyncOutcome;
  campaigns: SyncOutcome;
  insights: SyncOutcome;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Not "not configured, degrade gracefully" like the user-facing Meta
    // flows — a cron endpoint with no secret configured must never run.
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connections = await prisma.metaConnection.findMany({ select: { id: true } });
  const results: ConnectionRunResult[] = [];

  for (const { id: connectionId } of connections) {
    const adAccounts = await syncAdAccounts(connectionId);
    const campaigns = await syncCampaigns(connectionId);
    const insights = await syncInsights(connectionId);
    results.push({ connectionId, adAccounts, campaigns, insights });
  }

  return NextResponse.json({ ok: true, connectionsProcessed: connections.length, results });
}
