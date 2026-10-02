import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/recipe-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Same-origin: nginx reverse-proxies /api to recipe-api (react-webapp). This
// client adds nothing of its own about authorization — the bearer and the 401
// rule both come from src/authz/client.ts.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const recipeApi = createClient<paths>({ baseUrl: "/api" });
recipeApi.use(authMiddleware);
