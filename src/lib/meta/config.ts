// Central place to read Meta OAuth configuration. Never throws — the
// connect/callback routes check `configured` and show a clear "Meta غير
// مهيأ" state instead of crashing when the app isn't set up yet (Phase 1
// requirement: missing env vars must degrade gracefully, not take the
// whole app down).

// Graph API version is not a secret, so it's a plain constant rather than
// an env var — only META_APP_ID / META_APP_SECRET / META_REDIRECT_URI /
// META_TOKEN_ENCRYPTION_KEY are the environment variables for this phase.
export const META_GRAPH_API_VERSION = "v21.0";

// Phase 1 only ever requests read-only ads access — no write scopes.
export const META_OAUTH_SCOPES = ["ads_read"] as const;

interface MetaConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export function getMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return null;
  return { appId, appSecret, redirectUri };
}

export function metaAuthorizeUrl(config: MetaConfig, state: string): string {
  const url = new URL(`https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_OAUTH_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}
