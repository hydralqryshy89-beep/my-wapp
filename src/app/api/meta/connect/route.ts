// Starts the Meta OAuth flow. Node.js runtime (the default for Route
// Handlers in Next.js 16 — see src/proxy.ts, which stays on the Edge
// runtime and is untouched by this file) because this touches
// META_APP_SECRET indirectly via the signed state and will later touch
// the encryption key.
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { getMetaConfig, metaAuthorizeUrl } from "@/lib/meta/config";
import { createMetaOAuthState, META_OAUTH_STATE_COOKIE } from "@/lib/meta/oauth-state";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!user.isAdmin) {
    return NextResponse.redirect(new URL("/settings?metaError=forbidden", request.url));
  }

  const config = getMetaConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/settings?metaError=not_configured", request.url));
  }

  const state = await createMetaOAuthState(user.id);
  const response = NextResponse.redirect(metaAuthorizeUrl(config, state));
  response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/meta",
    maxAge: 10 * 60,
  });
  return response;
}
