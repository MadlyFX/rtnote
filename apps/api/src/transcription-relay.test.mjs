import { expect, test } from "bun:test";
import { Hono } from "hono";
import { isConfiguredTranscriptionEndpoint, registerTranscriptionRelay } from "./transcription-relay.ts";

const baseUrl = "https://speech.example/v1";
const target = `${baseUrl}/audio/transcriptions`;
const environment = { storage: { db: { prepare: (sql) => ({ bind: (workspaceId) => {
  expect(sql).toContain("FROM ai_transcription_providers");
  expect(workspaceId).toBe("workspace-1");
  return { all: async () => ({ results: [{ base_url: baseUrl }] }) };
} }) } } };
const request = (url = target, method = "POST", signal) => new Request("https://notes.example/api/v1/ai/provider-relay", {
  method: "POST",
  headers: {
    "x-rtnote-ai-target": url,
    "x-rtnote-ai-method": method,
    "x-rtnote-ai-headers": JSON.stringify({
      authorization: "Bearer speech-key",
      "content-type": "multipart/form-data; boundary=test",
      cookie: "session=private",
      "x-admin": "must-not-forward",
    }),
  },
  body: "--test--",
  signal,
});
const makeApp = (fetchProvider, kind = "user") => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (kind !== "anonymous") c.set("auth", { kind, actorType: "user", actorId: "user-1", workspaceId: "workspace-1", role: "member", scopes: [] });
    await next();
  });
  registerTranscriptionRelay(app, fetchProvider);
  return app;
};

test("relays a speech request unchanged and strips cookies and unrelated headers", async () => {
  let calls = 0;
  let upstreamSignal;
  const app = makeApp(async (url, init) => {
    calls++;
    upstreamSignal = init.signal;
    expect(String(url)).toBe(target);
    expect(init.redirect).toBe("manual");
    expect(init.headers.get("authorization")).toBe("Bearer speech-key");
    expect(init.headers.has("cookie")).toBe(false);
    expect(init.headers.has("x-admin")).toBe(false);
    expect(await new Response(init.body).text()).toBe("--test--");
    return Response.json({ text: "hello" }, { headers: { "set-cookie": "secret=x" } });
  });
  const stop = new AbortController();
  const result = await app.fetch(request(target, "POST", stop.signal), environment);
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ text: "hello" });
  expect(result.headers.has("set-cookie")).toBe(false);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(calls).toBe(1);
  stop.abort();
  expect(upstreamSignal.aborted).toBe(true);
});

for (const [url, method] of [
  ["https://other.example/v1/audio/transcriptions", "POST"],
  [`${baseUrl}/chat/completions`, "POST"],
  [`${baseUrl}/models`, "GET"],
  [`${target}?url=https://evil.example`, "POST"],
  [target, "DELETE"],
  ["https://user:password@speech.example/v1/audio/transcriptions", "POST"],
]) test(`denies anything but a configured speech endpoint: ${url} ${method}`, async () => {
  const app = makeApp(async () => { throw Error("Must not fetch"); });
  const result = await app.fetch(request(url, method), environment);
  expect(result.status).toBe(403);
});

test("speech service HTTP errors pass through without becoming an instance login failure", async () => {
  const app = makeApp(async () => Response.json({ error: { message: "Bad key" } }, { status: 401 }));
  expect((await app.fetch(request(), environment)).status).toBe(401);
});

test("only interactive users can use the relay", async () => {
  for (const kind of ["anonymous", "agent"]) {
    const app = makeApp(async () => { throw Error("Must not fetch"); }, kind);
    expect((await app.fetch(request(), environment)).status).toBe(403);
  }
});

test("never follows an upstream redirect to an unconfigured destination", async () => {
  let calls = 0;
  const app = makeApp(async (_url, init) => {
    calls++;
    expect(init.redirect).toBe("manual");
    return new Response(null, { status: 307, headers: { location: "https://unconfigured.example/steal" } });
  });
  const result = await app.fetch(request(), environment);
  expect(result.status).toBe(502);
  expect(calls).toBe(1);
  expect(result.headers.has("location")).toBe(false);
});

test("matches only the transcription path under the configured base URL", () => {
  expect(isConfiguredTranscriptionEndpoint(new URL(target), "POST", baseUrl)).toBe(true);
  expect(isConfiguredTranscriptionEndpoint(new URL(target), "POST", `${baseUrl}/`)).toBe(true);
  expect(isConfiguredTranscriptionEndpoint(new URL(`${baseUrl}/audio/transcriptions/extra`), "POST", baseUrl)).toBe(false);
  expect(isConfiguredTranscriptionEndpoint(new URL("https://speech.example/audio/transcriptions"), "POST", baseUrl)).toBe(false);
  expect(isConfiguredTranscriptionEndpoint(new URL(target), "GET", baseUrl)).toBe(false);
  expect(isConfiguredTranscriptionEndpoint(new URL(target), "POST", "not a url")).toBe(false);
});
