// Typed read of window._env_, mounted by the platform's /env-config.js at
// request time (react-webapp). Throws rather than defaulting a missing key —
// a silent fallback would hide a missing OIDC issuer.
//
// Only the four keys the browser reads for the `cook-auth` dependency are
// declared here. `COOK_AUTH_JWKS_URL` is emitted too, but the browser never
// validates a token — the API gateway does — so no asset here reads it.
// Sibling service addresses (recipe-api, recipe-import-agent) are never
// window._env_ keys: both are reached same-origin through nginx's /api proxy.
type Env = {
  COOK_AUTH_CLIENT_ID: string;
  COOK_AUTH_ISSUER: string;
  COOK_AUTH_SCOPES: string;
  COOK_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
