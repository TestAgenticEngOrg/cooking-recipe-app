import ballerina/os;

// recipe-db (platform-resource, postgres-cnpg) — envBindings from design.json, verbatim.
configurable string recipeDbHost = os:getEnv("RECIPE_DB_HOST");
configurable string recipeDbPort = os:getEnv("RECIPE_DB_PORT");
configurable string recipeDbName = os:getEnv("RECIPE_DB_DBNAME");
configurable string recipeDbUser = os:getEnv("RECIPE_DB_USER");
configurable string recipeDbPassword = os:getEnv("RECIPE_DB_PASSWORD");

// cook-auth (platform-resource, thunder-app) — not read directly by this service
// (the gateway validates the caller's token against it before a request ever
// arrives here), but the env vars are wired per design.json all the same.
configurable string cookAuthClientId = os:getEnv("COOK_AUTH_CLIENT_ID");
configurable string cookAuthIssuer = os:getEnv("COOK_AUTH_ISSUER");
configurable string cookAuthJwksUrl = os:getEnv("COOK_AUTH_JWKS_URL");
configurable string cookAuthResource = os:getEnv("COOK_AUTH_RESOURCE");
configurable string cookAuthScopes = os:getEnv("COOK_AUTH_SCOPES");
