// What window._env_ holds in mock mode — exactly the keys src/env.ts declares
// for the `cook-auth` dependency, and nothing a sibling service would need
// (recipe-api and recipe-import-agent are same-origin /api, never a browser
// key — react-webapp).
export const mockEnv = {
  COOK_AUTH_CLIENT_ID: "mock-client",
  COOK_AUTH_ISSUER: "https://mock-idp.test",
  COOK_AUTH_SCOPES:
    "openid profile email group ou " +
    "recipes:read recipes:create recipes:update recipes:delete " +
    "meal-plan:read meal-plan:manage shopping-list:read shopping-list:update",
  COOK_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
