import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

// Not "public" in the browsable sense — this authenticates itself with its
// own CRON_SECRET check inside the route handler (see
// src/app/api/meta/cron/sync/route.ts), because a Vercel Cron invocation
// carries no browser session cookie for this proxy to find. Exempting it
// here only changes *which* check gates that one machine-to-machine route;
// it stays fully protected, just not by a user session.
const SESSION_EXEMPT_PATHS = ["/api/meta/cron"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isSessionExempt =
    isPublic || SESSION_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isSessionExempt) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") {
    // Edge runtime has no DB access to pick the user's first accessible section,
    // so hand off to "/" (a Node-runtime page) which resolves the real landing page.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
