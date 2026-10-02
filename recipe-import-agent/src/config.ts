// All configuration is read from the environment, here, once — every other
// module reads through this file and never calls process.env itself.

export const PORT = Number(process.env.PORT ?? 9090);

// Model access. An ai-agent gets model access from its component type, not a
// dependency: the platform injects these the same way whether the connection
// is governed or not. None has a fallback — a default model id is right for
// one host and wrong for every other, so a missing one is reported, not guessed.
export const config = {
  modelApiFormat: process.env.MODEL_API_FORMAT ?? "",
  modelEndpoint: process.env.MODEL_ENDPOINT ?? "",
  modelApiKey: process.env.MODEL_API_KEY ?? "",
  modelName: process.env.MODEL_NAME ?? "",
  // Normally unset — see "MODEL_API_KEY_HEADER" in the agent-building skill.
  modelApiKeyHeader: process.env.MODEL_API_KEY_HEADER,
  modelApiAuthScheme: process.env.MODEL_API_AUTH_SCHEME,

  // cook-auth (platform-resource, thunder-app) — wired per design.json, but
  // not read by this service directly: the API Platform Gateway validates the
  // caller's token against this app before a request ever reaches this pod,
  // and hands the verified identity on as `x-user-id`. Kept here only so the
  // wiring is recorded and the env vars are visibly accounted for.
  cookAuthClientId: process.env.COOK_AUTH_CLIENT_ID,
  cookAuthIssuer: process.env.COOK_AUTH_ISSUER,
  cookAuthJwksUrl: process.env.COOK_AUTH_JWKS_URL,
  cookAuthResource: process.env.COOK_AUTH_RESOURCE,
  cookAuthScopes: process.env.COOK_AUTH_SCOPES,

  // No `postgres-cnpg` dependency is declared for this component — the design
  // holds this agent to no memory beyond a single extraction turn. These stay
  // undefined forever in this deployment, which is what keeps the store below
  // permanently on its in-memory backing; see store.ts.
  memoryDbHost: process.env.MEMORY_DB_HOST,
  memoryDbPort: process.env.MEMORY_DB_PORT,
  memoryDbName: process.env.MEMORY_DB_DBNAME,
  memoryDbUser: process.env.MEMORY_DB_USER,
  memoryDbPassword: process.env.MEMORY_DB_PASSWORD,
};

// This agent declares no `x-aep.attachments` block, so it takes no files.
export const ATTACHMENTS: { types: string[]; maxFiles: number; maxFileSizeMB: number } | null = null;

// The required model variables. /healthz lists whichever of these are unset;
// a turn attempted while any is missing fails at the model call, not here.
export const REQUIRED_MODEL_VARS: Array<[string, string]> = [
  ["MODEL_API_FORMAT", config.modelApiFormat],
  ["MODEL_ENDPOINT", config.modelEndpoint],
  ["MODEL_API_KEY", config.modelApiKey],
  ["MODEL_NAME", config.modelName],
];
