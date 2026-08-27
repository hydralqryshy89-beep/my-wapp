// Meta OAuth callback — Node.js runtime (default for Route Handlers).
// Exchanges the one-time `code` for an access token, encrypts it, and
// stores the connection. The access token itself is never logged, never
// put in a URL, and never sent back to the browser at any point.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { getMetaConfig, META_GRAPH_API_VERSION, META_OAUTH_SCOPES } from "@/lib/meta/config";
import { verifyMetaOAuthState, META_OAUTH_STATE_COOKIE } from "@/lib/meta/oauth-state";
import { encryptToken } from "@/lib/meta/encryption";

function redirectWithError(request: NextRequest, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/settings?metaError=${code}`, request.url));
  // Always clear the one-time state cookie, success or failure, so it can't be replayed.
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", { path: "/api/meta", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // The user can cancel Meta's consent dialog — Meta then redirects back with
  // an `error` param instead of `code`. Nothing to exchange in that case.
  if (searchParams.get("error")) {
    return redirectWithError(request, "oauth_denied");
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!user.isAdmin) {
    return redirectWithError(request, "forbidden");
  }
  if (!user.companyId) {
    return redirectWithError(request, "no_company");
  }

  const stateFromQuery = searchParams.get("state");
  const stateFromCookie = request.cookies.get(META_OAUTH_STATE_COOKIE)?.value;
  const stateValid = await verifyMetaOAuthState(stateFromQuery, stateFromCookie, user.id);
  if (!stateValid) {
    return redirectWithError(request, "invalid_state");
  }

  const config = getMetaConfig();
  if (!config) {
    return redirectWithError(request, "not_configured");
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectWithError(request, "missing_code");
  }

  let accessToken: string;
  let expiresInSeconds: number | undefined;
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", config.appId);
    tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
    tokenUrl.searchParams.set("client_secret", config.appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("Meta token exchange failed:", tokenJson.error?.message ?? tokenRes.status);
      return redirectWithError(request, "token_exchange_failed");
    }
    accessToken = tokenJson.access_token;
    expiresInSeconds = tokenJson.expires_in;
  } catch (err) {
    console.error("Meta token exchange request failed:", err instanceof Error ? err.message : err);
    return redirectWithError(request, "token_exchange_failed");
  }

  // Best-effort — the connection is still useful without a friendly name attached.
  let metaUserId: string | null = null;
  let metaUserName: string | null = null;
  try {
    const meUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/me`);
    meUrl.searchParams.set("fields", "id,name");
    meUrl.searchParams.set("access_token", accessToken);
    const meRes = await fetch(meUrl.toString());
    if (meRes.ok) {
      const meJson = (await meRes.json()) as { id?: string; name?: string };
      metaUserId = meJson.id ?? null;
      metaUserName = meJson.name ?? null;
    }
  } catch {
    // Non-fatal — leave metaUserId/metaUserName unset.
  }

  const accessTokenEncrypted = encryptToken(accessToken);
  const tokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;

  await prisma.metaConnection.upsert({
    where: { companyId: user.companyId },
    create: {
      companyId: user.companyId,
      accessTokenEncrypted,
      tokenExpiresAt,
      scopes: META_OAUTH_SCOPES.join(","),
      metaUserId,
      metaUserName,
    },
    update: {
      accessTokenEncrypted,
      tokenExpiresAt,
      scopes: META_OAUTH_SCOPES.join(","),
      metaUserId,
      metaUserName,
      connectedAt: new Date(),
      lastError: null,
    },
  });

  const response = NextResponse.redirect(new URL("/settings?metaConnected=1", request.url));
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", { path: "/api/meta", maxAge: 0 });
  return response;
}
