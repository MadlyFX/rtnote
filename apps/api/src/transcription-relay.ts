import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "./api-context";
import { apiError } from "./http-errors";
import { getWorkspaceId, requireUser } from "./request-auth";

// Browsers cannot reach most speech services directly because of CORS. When
// the direct request fails before any response, the web app replays it here.
// Only POSTs to `/audio/transcriptions` of a saved, enabled speech service pass.

const relayHeaders = new Set(["authorization", "content-type", "accept"]);

export const isConfiguredTranscriptionEndpoint = (target: URL, method: string, baseUrl: string): boolean => {
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || target.hash) return false;
  if (method !== "POST" || target.search) return false;
  let base: URL;
  try { base = new URL(baseUrl); } catch { return false; }
  if (target.origin !== base.origin) return false;
  const root = base.pathname.replace(/\/+$/, "");
  return target.pathname === `${root}/audio/transcriptions`;
};

export const registerTranscriptionRelay = (app: Hono<AppEnv>, fetchProvider: typeof fetch = (...args) => fetch(...args)) => {
  // The path and header names are unchanged so installed clients keep working.
  app.post("/api/v1/ai/provider-relay", bodyLimit({ maxSize: 64 * 1024 * 1024 }), async c => {
    const denied = requireUser(c);
    if (denied) return denied;
    let target: URL;
    let headers: Headers;
    const method = c.req.header("x-rtnote-ai-method") ?? "POST";
    try {
      target = new URL(c.req.header("x-rtnote-ai-target") ?? "");
      const raw = JSON.parse(c.req.header("x-rtnote-ai-headers") ?? "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid headers");
      headers = new Headers();
      for (const [key, value] of Object.entries(raw)) {
        if (relayHeaders.has(key.toLowerCase()) && typeof value === "string") headers.set(key, value);
      }
    } catch { return apiError(c, "ai_relay_invalid", "Invalid speech service request.", 400); }
    const rows = await c.env.storage.db.prepare(
      `SELECT base_url FROM ai_transcription_providers WHERE workspace_id = ? AND is_enabled = 1`,
    ).bind(getWorkspaceId(c)).all<{ base_url: string }>();
    if (!rows.results.some(row => isConfiguredTranscriptionEndpoint(target, method, row.base_url))) {
      return apiError(c, "ai_relay_target_denied", "Save and enable this speech service before using the browser fallback.", 403);
    }
    try {
      const requestInit: RequestInit & { duplex?: "half" } = {
        method, headers, redirect: "manual", signal: c.req.raw.signal,
        body: c.req.raw.body, duplex: "half",
      };
      const upstream = await fetchProvider(target, requestInit);
      if (upstream.status >= 300 && upstream.status < 400) {
        await upstream.body?.cancel();
        return apiError(c, "ai_relay_redirect_denied", "Speech service redirects are not supported.", 502);
      }
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
      });
    } catch {
      return apiError(c, "ai_relay_unavailable", "The instance could not reach the speech service.", 502);
    }
  });
};
