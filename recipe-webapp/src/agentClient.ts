// Hand-written client for the recipe-import-agent dependency. An `ai-agent`
// has no OpenAPI contract — only the platform's one fixed chat shape
// (react-webapp) — so there is nothing to generate here. Reached same-origin,
// as an extra sibling of the primary recipe-api dependency: `/api/recipe-import-agent/chat`,
// never through a window._env_ URL. Same bearer and 401 rule as any other
// sibling call.
import { authorizationHeader, classifyResponse, ForbiddenError, ApiError } from "./authz/client";

export interface ChatAttachment {
  name: string;
  mediaType: string;
  data: string; // base64
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  attachments?: ChatAttachment[];
}

export interface ChatResponse {
  conversationId: string;
  text: string;
  toolCalls: unknown[];
}

const AGENT_BASE = "/api/recipe-import-agent";

/**
 * One chat turn with the import agent. Throws ForbiddenError/ApiError the same
 * way src/authz/client.ts's apiFetch does — callers handle it identically to
 * any other sibling call.
 */
export async function sendChatMessage(body: ChatRequest): Promise<ChatResponse> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const header = await authorizationHeader();
  if (header) headers.set("Authorization", header);

  const response = await fetch(`${AGENT_BASE}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const outcome = await classifyResponse(response.status);
  if (outcome === "forbidden") throw new ForbiddenError(response.status);
  if (outcome === "signin") throw new ApiError(response.status, "Signing in…");

  if (!response.ok) {
    let message = `${response.status} ${response.statusText || "request failed"}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // body was not JSON — keep the status line
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as ChatResponse;
}
