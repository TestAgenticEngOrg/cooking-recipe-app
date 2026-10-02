// tracing.ts is imported first for its side effects — it must register the
// OpenTelemetry provider before anything creates a model client.
import "./tracing.js";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { ModelMessage } from "ai";
import { PORT, REQUIRED_MODEL_VARS } from "./config.js";
import { genAiSystem, runTurn } from "./agent.js";
import { traceTurn } from "./tracing.js";
import { ensureStore, initStore, isStoreReady, loadConversation, saveConversation } from "./store.js";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(payload);
}

const BODY_CAP = 24 * 1024 * 1024;

// Keep at most BODY_CAP. Past it, answer 413 ONCE and keep reading without
// keeping anything, so the client finishes sending and actually sees the 413 —
// destroying the request or closing the socket mid-upload resets the
// connection and the caller gets a network error instead. Past twice the cap,
// stop draining and drop it. Resolves null when the request was refused.
function readBody(req: IncomingMessage, res: ServerResponse): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    const refuse = () => { over = true; chunks.length = 0; sendJson(res, 413, { error: "request too large" }); };
    if (Number(req.headers["content-length"] ?? 0) > BODY_CAP) refuse();
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2 * BODY_CAP) { req.destroy(); return; }
      if (over) return;
      if (size > BODY_CAP) { refuse(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(over ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(null));
    req.on("close", () => { if (!req.complete) resolve(null); });
  });
}

// This agent declares no `x-aep.attachments` block, so `attachments` is not
// part of its request vocabulary at all.
const BODY_FIELDS = new Set(["conversationId", "message"]);

function validate(body: unknown): { message: string; conversationId?: string } | { error: string } {
  const unknown = Object.keys((body ?? {}) as Record<string, unknown>).find((key) => !BODY_FIELDS.has(key));
  if (unknown) return { error: `unknown field: ${unknown}` };
  const b = body as { message?: unknown; conversationId?: unknown } | null | undefined;
  const message = typeof b?.message === "string" ? b.message.trim() : null;
  if (message === null) return { error: "expected { message: string }" };
  if (message === "") return { error: "expected a message" };
  if (b?.conversationId !== undefined && typeof b.conversationId !== "string") {
    return { error: "conversationId must be a string" };
  }
  return { message, conversationId: b?.conversationId as string | undefined };
}

// Reads the AI SDK's APICallError body; returns null for anything else.
function guardrailBlock(err: unknown): { name: string; reason: string } | null {
  const body = (err as { responseBody?: string; data?: unknown })?.responseBody;
  if (!body) return null;
  try {
    const m = (JSON.parse(body) as { message?: { action?: string; actionReason?: string; interveningGuardrail?: string } })?.message;
    if (m?.action !== "GUARDRAIL_INTERVENED") return null;
    return { name: m.interveningGuardrail ?? "guardrail", reason: m.actionReason ?? "refused by policy" };
  } catch { return null; }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === "GET" && req.url === "/healthz") {
    const missing = REQUIRED_MODEL_VARS.filter(([, value]) => !value).map(([name]) => name);
    const ok = missing.length === 0 && isStoreReady();
    sendJson(res, ok ? 200 : 503, { ok, missing, store: isStoreReady() ? "ready" : "initialising" });
    return;
  }

  if (!(req.method === "POST" && req.url === "/chat")) {
    res.statusCode = 404;
    res.end();
    return;
  }

  // Inbound gate: who is calling me. The API Platform Gateway has already
  // validated the caller's token against cook-auth and hands the result on as
  // this header; never derive identity from the request body.
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId === "") {
    res.statusCode = 401;
    res.end();
    return;
  }

  const raw = await readBody(req, res);
  if (raw === null) return; // readBody already answered (413) or the client went away

  let parsedBody: unknown;
  try {
    parsedBody = raw === "" ? {} : JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "expected { message: string }" });
    return;
  }

  const v = validate(parsedBody);
  if ("error" in v) {
    sendJson(res, 400, { error: v.error });
    return;
  }
  const { message, conversationId: conversationIdIn } = v;

  try {
    await ensureStore();
  } catch (err) {
    console.error("store not ready:", err);
    sendJson(res, 500, { error: "internal error" });
    return;
  }

  let id: string;
  let history: ModelMessage[];
  if (conversationIdIn !== undefined) {
    const loaded = await loadConversation(conversationIdIn, userId);
    if (loaded === null) {
      sendJson(res, 404, { error: "conversation not found" });
      return;
    }
    id = conversationIdIn;
    history = loaded;
  } else {
    id = randomUUID();
    history = [];
  }

  const user: ModelMessage = { role: "user", content: message };
  const full = [...history, user];

  try {
    const turn = await traceTurn(
      { conversationId: id, model: process.env.MODEL_NAME ?? "", system: genAiSystem, message },
      (hooks) => runTurn(full, hooks),
    );
    await saveConversation(id, userId, [...history, user, ...turn.steps.flatMap((s) => s.response.messages)]);
    sendJson(res, 200, { conversationId: id, text: turn.text, toolCalls: turn.toolCalls });
  } catch (err) {
    const g = guardrailBlock(err);
    if (g) {
      sendJson(res, 422, { error: g.reason, guardrail: g.name });
      return;
    }
    console.error("chat turn failed:", err);
    sendJson(res, 500, { error: "internal error" });
  }
}

const server = createServer();
server.on("request", (req, res) => {
  void handle(req, res).catch((err) => {          // the last line of defence:
    console.error("chat turn failed:", err);      // `void handle(...)` alone
    if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    else res.destroy();                           // already streaming: cut it
  });
});

// Fire-and-forget: the DB may not be reachable yet. Every request's
// ensureStore() retries until the schema init succeeds; /healthz reports the
// not-ready condition via isStoreReady() instead of the pod crash-looping.
initStore();

server.listen(PORT);
