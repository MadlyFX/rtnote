import { afterAll, describe, expect, test } from "bun:test";
import { createAiDirectRuntime } from "../../../desktop/src/main/ai-direct.mjs";

const storage = new Map();
const calls = [];
const events = [];
let completeSave;
let secureSessionToken = "";
let failSecureSessionWrite = false;
let aiRuntime;
const aiStreamListeners = new Set();
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");

// Must be installed before importing modules that read `window` at load time.
globalThis.window = {
  location: { hostname: "notes.example.com", origin: "https://notes.example.com" },
  edgeeverDesktop: {
    isAvailable: true,
    apiBaseUrl: "",
    openAiProviderStream: (requestId, input) => aiRuntime.open(requestId, input, {
      onData: bytes => { for (const listener of aiStreamListeners) listener(requestId, { type: "data", bytes }); },
      onEnd: () => { for (const listener of aiStreamListeners) listener(requestId, { type: "end" }); },
      onError: error => { for (const listener of aiStreamListeners) listener(requestId, { type: "error", message: error.message }); },
    }),
    onAiProviderStreamChunk: listener => {
      aiStreamListeners.add(listener);
      return () => aiStreamListeners.delete(listener);
    },
    cancelAiProviderStream: requestId => aiRuntime.cancel(requestId),
    setApiBaseUrl: async (value) => {
      calls.push(["bridge:start", value]);
      if (!value) {
        calls.push(["bridge:complete", value]);
        return value;
      }
      await new Promise((resolve) => {
        completeSave = resolve;
      });
      calls.push(["bridge:complete", value]);
      return value;
    },
    getSessionToken: () => secureSessionToken,
    setSessionToken: async (value) => {
      if (failSecureSessionWrite) throw new Error("secure storage unavailable");
      secureSessionToken = value;
      return { stored: Boolean(value) };
    },
    clearSessionToken: async () => {
      secureSessionToken = "";
      return { stored: false };
    },
  },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      calls.push(["storage", value]);
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
  },
  dispatchEvent: (event) => {
    events.push(event.type);
    return true;
  },
};

afterAll(() => {
  if (originalFetch) {
    Object.defineProperty(globalThis, "fetch", originalFetch);
  } else {
    delete globalThis.fetch;
  }
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    delete globalThis.window;
  }
});

// Other test files may have imported the browser client before this desktop bridge.
const {
  ApiRequestError,
  DESKTOP_API_BASE_URL_STORAGE_KEY,
  api,
  speechProviderFetch,
  cacheDesktopSession,
  clearCachedDesktopSession,
  getConfiguredDesktopApiBaseUrl,
  getCachedDesktopSession,
  getWorkspaceSession,
  getOrCreateClientDeviceId,
  saveDesktopApiBaseUrl,
} = await import("./api.ts?desktop-ai-routing-test");

describe("browser device identity", () => {
  const deviceKey = "edgeever.web.device-id";

  test("reuses the persisted browser device id across repeated calls", () => {
    const previous = storage.get(deviceKey);
    const previousCallCount = calls.length;
    storage.delete(deviceKey);
    try {
      const first = getOrCreateClientDeviceId();
      expect(first).toMatch(/^web-/);
      expect(storage.get(deviceKey)).toBe(first);
      expect(getOrCreateClientDeviceId()).toBe(first);
    } finally {
      calls.length = previousCallCount;
      if (previous === undefined) storage.delete(deviceKey);
      else storage.set(deviceKey, previous);
    }
  });

  test("currently generates a different device id on each call when browser storage is blocked", () => {
    const localStorage = window.localStorage;
    window.localStorage = {
      getItem: () => { throw new Error("Storage blocked"); },
      setItem: () => { throw new Error("Storage blocked"); },
    };
    try {
      const first = getOrCreateClientDeviceId();
      const second = getOrCreateClientDeviceId();
      expect(first).toMatch(/^web-/);
      expect(second).toMatch(/^web-/);
      expect(second).not.toBe(first);
    } finally {
      window.localStorage = localStorage;
    }
  });
});

const speechRequest = (url, signal) => {
  const form = new FormData();
  form.set("model", "whisper-1");
  form.set("file", new File(["audio bytes"], "clip.mp3", { type: "audio/mpeg" }));
  return speechProviderFetch(url, { method: "POST", headers: { Authorization: "Bearer speech-key" }, body: form, signal });
};

describe("desktop speech transport", () => {
  test("sends multipart audio to a private speech service through the desktop bridge", async () => {
    const providerRequests = [];
    globalThis.fetch = async (url) => { throw new Error(`Unexpected instance request: ${url}`); };
    aiRuntime = createAiDirectRuntime({ fetchImpl: async (url, init) => {
      providerRequests.push({ url, auth: new Headers(init.headers).get("Authorization"), type: new Headers(init.headers).get("Content-Type") });
      return Response.json({ text: "recognized" });
    } });
    const response = await speechRequest("http://10.20.30.40:9000/v1/audio/transcriptions");
    expect(await response.json()).toEqual({ text: "recognized" });
    expect(providerRequests).toHaveLength(1);
    expect(providerRequests[0].url).toBe("http://10.20.30.40:9000/v1/audio/transcriptions");
    expect(providerRequests[0].auth).toBe("Bearer speech-key");
    expect(providerRequests[0].type).toMatch(/^multipart\/form-data; boundary=/);
    expect(aiRuntime.activeCount).toBe(0);
    expect(aiStreamListeners.size).toBe(0);
  });

  test("cancelling a speech request rejects a pending read and releases the transport", async () => {
    const controller = new AbortController();
    let providerSignal;
    aiRuntime = createAiDirectRuntime({ fetchImpl: async (_url, init) => {
      providerSignal = init.signal;
      return new Response(new ReadableStream({
        start(stream) {
          init.signal.addEventListener("abort", () => stream.error(init.signal.reason), { once: true });
        },
      }));
    } });
    const response = await speechRequest("http://127.0.0.1:9000/v1/audio/transcriptions", controller.signal);
    const reader = response.body.getReader();
    const reading = reader.read();
    controller.abort();
    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
    expect(providerSignal.aborted).toBe(true);
    expect(aiRuntime.activeCount).toBe(0);
    expect(aiStreamListeners.size).toBe(0);
  });

  test("the desktop bridge refuses anything but a speech transcription request", async () => {
    aiRuntime = createAiDirectRuntime({ fetchImpl: async () => { throw new Error("must not fetch"); } });
    await expect(speechProviderFetch("http://127.0.0.1:11434/v1/chat/completions", { method: "POST", body: "{}" })).rejects.toThrow();
    expect(aiRuntime.activeCount).toBe(0);
  });
});

describe("desktop instance setup", () => {
  test("can retry with a valid URL after invalid input", async () => {
    await expect(saveDesktopApiBaseUrl("ftp://example.com")).rejects.toThrow();

    const saving = saveDesktopApiBaseUrl(" https://notes.example.com/ ");
    await Promise.resolve();
    expect(calls).toEqual([["bridge:start", "https://notes.example.com"]]);
    expect(storage.has(DESKTOP_API_BASE_URL_STORAGE_KEY)).toBe(false);

    completeSave();
    await expect(saving).resolves.toBe("https://notes.example.com");
    expect(calls).toEqual([
      ["bridge:start", "https://notes.example.com"],
      ["bridge:complete", "https://notes.example.com"],
      ["storage", "https://notes.example.com"],
    ]);
    expect(storage.get(DESKTOP_API_BASE_URL_STORAGE_KEY)).toBe("https://notes.example.com");
  });

  test("does not expand a bare demo alias into a hosted instance", async () => {
    calls.length = 0;
    const saving = saveDesktopApiBaseUrl("demo");
    await Promise.resolve();
    expect(calls).toEqual([["bridge:start", "https://demo"]]);
    completeSave();
    await expect(saving).resolves.toBe("https://demo");
  });

  test("prefixes https when the instance host has no protocol", async () => {
    calls.length = 0;
    const saving = saveDesktopApiBaseUrl(" example.workers.dev/ ");
    await Promise.resolve();
    expect(calls).toEqual([["bridge:start", "https://example.workers.dev"]]);
    completeSave();
    await expect(saving).resolves.toBe("https://example.workers.dev");
    expect(storage.get(DESKTOP_API_BASE_URL_STORAGE_KEY)).toBe("https://example.workers.dev");
  });

  test("keeps an explicit http instance URL", async () => {
    calls.length = 0;
    const saving = saveDesktopApiBaseUrl("http://127.0.0.1:8787/");
    await Promise.resolve();
    expect(calls).toEqual([["bridge:start", "http://127.0.0.1:8787"]]);
    completeSave();
    await expect(saving).resolves.toBe("http://127.0.0.1:8787");
  });

  test("clears the cached session when the login form changes instances", async () => {
    calls.length = 0;
    window.edgeeverDesktop.apiBaseUrl = "https://notes.example.com";
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://notes.example.com");
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "old-instance-session",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });
    calls.length = 0;

    const saving = saveDesktopApiBaseUrl("https://other.example.com");
    await Promise.resolve();

    expect(getCachedDesktopSession()).toBeNull();
    expect(calls).toEqual([
      ["bridge:start", "https://other.example.com"],
    ]);

    completeSave();
    await expect(saving).resolves.toBe("https://other.example.com");
    expect(storage.get(DESKTOP_API_BASE_URL_STORAGE_KEY)).toBe("https://other.example.com");
    expect(getConfiguredDesktopApiBaseUrl()).toBe("https://other.example.com");
    window.edgeeverDesktop.apiBaseUrl = "";
  });

  test("ignores a leftover desktop instance URL in the browser", () => {
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://example.workers.dev");
    window.edgeeverDesktop.isAvailable = false;
    expect(getConfiguredDesktopApiBaseUrl()).toBe("");
    window.edgeeverDesktop.isAvailable = true;
    expect(getConfiguredDesktopApiBaseUrl()).toBe("https://example.workers.dev");
  });

  test("preserves the desktop token when refreshing the same authenticated session", async () => {
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "desktop-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });

    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      user: { id: "user-1", username: "admin", displayName: "Owner", role: "owner" },
    });

    expect(getCachedDesktopSession()).toEqual({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      user: { id: "user-1", username: "admin", displayName: "Owner", role: "owner" },
    });
  });

  test("does not carry a desktop token into a different account session", async () => {
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "user-1-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });

    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      user: { id: "user-2", username: "member", displayName: null, role: "member" },
    });

    expect(getCachedDesktopSession()?.sessionToken).toBeUndefined();
  });

  test("migrates a legacy localStorage token into desktop secure storage", async () => {
    clearCachedDesktopSession();
    await Promise.resolve();
    storage.set("edgeever.desktop.session", JSON.stringify({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "legacy-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    }));

    const requests = [];
    globalThis.fetch = async (_url, init) => {
      requests.push(new Headers(init?.headers).get("Authorization"));
      return Response.json({
        authRequired: true,
        authenticated: true,
        demoMode: false,
        user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
      });
    };

    const session = await api.getSession();
    await cacheDesktopSession(session);

    expect(requests).toEqual(["Bearer legacy-session-token"]);
    expect(secureSessionToken).toBe("legacy-session-token");
    expect(getCachedDesktopSession()?.sessionToken).toBeUndefined();
  });

  test("keeps a localStorage fallback when secure token persistence fails", async () => {
    failSecureSessionWrite = true;
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "fallback-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });
    failSecureSessionWrite = false;

    expect(getCachedDesktopSession()?.sessionToken).toBe("fallback-session-token");
  });

  test("keeps secure credentials out of unauthenticated session snapshots", async () => {
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "desktop-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });
    await Promise.resolve();

    await cacheDesktopSession({
      authRequired: true,
      authenticated: false,
      demoMode: false,
      user: null,
    });

    expect(secureSessionToken).toBe("desktop-session-token");
    expect(getCachedDesktopSession()).toEqual({
      authRequired: true,
      authenticated: false,
      demoMode: false,
      user: null,
    });
  });

  test("clears a secure token only after the server rejects that exact credential", async () => {
    events.length = 0;
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "rejected-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });
    await Promise.resolve();

    globalThis.fetch = async () => Response.json({
      authRequired: true,
      authenticated: false,
      demoMode: false,
      user: null,
    });

    await expect(api.getSession()).resolves.toMatchObject({ authenticated: false });
    await Promise.resolve();
    expect(secureSessionToken).toBe("");
    expect(events).toEqual([]);

    globalThis.fetch = async () => Response.json({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "replacement-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });
    await cacheDesktopSession(await api.login({ username: "admin", password: "secret" }));
  });

  test("keeps the desktop session after a route-specific 401", async () => {
    events.length = 0;
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "desktop-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });

    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url, authorization: new Headers(init?.headers).get("Authorization") });
      if (String(url).endsWith("/api/v1/auth/session")) {
        return Response.json({ authRequired: true, authenticated: true, demoMode: false, user: { id: "user-1" } });
      }
      if (String(url).endsWith("/api/v1/auth/sessions")) return Response.json({ sessions: [] });
      return Response.json({ error: { code: "unauthorized", message: "Authentication required" } }, { status: 401 });
    };

    await expect(api.changePassword({
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
    })).rejects.toMatchObject({ status: 401 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(api.listLoginDeviceSessions()).resolves.toEqual({ sessions: [] });

    expect(requests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/api/v1/auth/change-password",
      "/api/v1/auth/session",
      "/api/v1/auth/sessions",
    ]);
    expect(requests.every(({ authorization }) => authorization === "Bearer desktop-session-token")).toBe(true);
    expect(secureSessionToken).toBe("desktop-session-token");
    expect(events).toEqual([]);
  });

  test("uses the desktop session token and stops network retries after a confirmed 401", async () => {
    calls.length = 0;
    events.length = 0;
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://notes.example.com");
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "desktop-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });

    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url, authorization: new Headers(init?.headers).get("Authorization") });
      if (String(url).endsWith("/api/v1/auth/session")) {
        return Response.json({ authRequired: true, authenticated: false, demoMode: false, user: null });
      }
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    };

    await expect(api.syncBootstrap({ limit: 200 })).rejects.toMatchObject({ status: 401 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(api.syncBootstrap({ limit: 200 })).rejects.toMatchObject({ status: 401 });

    expect(requests).toEqual([{
      url: "https://notes.example.com/api/v1/sync/bootstrap?limit=200",
      authorization: "Bearer desktop-session-token",
    }, {
      url: "https://notes.example.com/api/v1/auth/session",
      authorization: "Bearer desktop-session-token",
    }]);
    expect(events).toEqual(["edgeever:unauthorized"]);
    expect(getCachedDesktopSession()).toBeNull();

    globalThis.fetch = async (url, init) => {
      requests.push({ url, authorization: new Headers(init?.headers).get("Authorization") });
      return Response.json({
        authRequired: true,
        authenticated: true,
        demoMode: false,
        sessionToken: "replacement-session-token",
        user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
      });
    };

    const replacement = await api.login({ username: "admin", password: "secret" });
    await cacheDesktopSession(replacement);
    await api.syncBootstrap({ limit: 200 });

    expect(requests.at(-1)).toEqual({
      url: "https://notes.example.com/api/v1/sync/bootstrap?limit=200",
      authorization: "Bearer replacement-session-token",
    });
  });

  test("does not clear a replacement session when an older desktop token is rejected late", async () => {
    events.length = 0;
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://notes.example.com");
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "stale-session-token",
      user: { id: "user-1", username: "admin", displayName: null, role: "owner" },
    });

    let releaseRequest;
    globalThis.fetch = async () => {
      await new Promise((resolve) => {
        releaseRequest = resolve;
      });
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    };

    const staleRequest = api.syncBootstrap({ limit: 200 });
    await Promise.resolve();
    await cacheDesktopSession({
      authRequired: true,
      authenticated: true,
      demoMode: false,
      sessionToken: "current-session-token",
      user: { id: "user-1", username: "admin", displayName: "Owner", role: "owner" },
    });
    releaseRequest();

    await expect(staleRequest).rejects.toMatchObject({ status: 401 });
    await Promise.resolve();
    expect(secureSessionToken).toBe("current-session-token");
    expect(getCachedDesktopSession()).toMatchObject({ authenticated: true, user: { id: "user-1" } });
    expect(events).toEqual([]);
  });

  test("preserves Cloudflare response diagnostics for login failures", async () => {
    globalThis.fetch = async () => new Response("<html>challenge</html>", {
      status: 403,
      headers: {
        "CF-Mitigated": "challenge",
        "CF-Ray": "abc123-SJC",
        "Content-Type": "text/html",
      },
    });

    try {
      await api.login({ username: "admin", password: "secret" });
      throw new Error("Expected login to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error).toMatchObject({
        status: 403,
        responseDiagnostics: {
          cloudflareMitigated: true,
          isEdgeEverApiError: false,
          rayId: "abc123-SJC",
        },
      });
    }
  });

});


describe("desktop workspace during a server outage", () => {
  const session = {
    authRequired: true, authenticated: true, demoMode: false,
    sessionToken: "offline-workspace-token",
    user: { id: "offline-user", username: "offline", displayName: null, role: "owner" },
  };
  const establishSession = async () => {
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://notes.example.com");
    globalThis.fetch = async () => Response.json(session);
    await cacheDesktopSession(await api.login({ username: "offline", password: "test" }));
    events.length = 0;
  };

  test("opens the cached desktop account on 500/503, quota, throttling and network failures while online", async () => {
    await establishSession();
    for (const status of [500, 502, 503, 504, 408, 429]) {
      globalThis.fetch = async () => Response.json({ error: { code: "database_daily_quota_exceeded", message: "Unavailable" } }, { status });
      expect(await getWorkspaceSession()).toMatchObject({ authenticated: true, user: session.user });
      expect(secureSessionToken).toBe(session.sessionToken);
    }
    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    expect(await getWorkspaceSession()).toMatchObject({ authenticated: true, user: session.user });
    expect(events).toEqual([]);
  });

  test("failed 401 confirmation never clears the local account or credential", async () => {
    await establishSession();
    for (const failure of [500, 503, 429, "network", "invalid-json", "invalid-session"]) {
      globalThis.fetch = async url => {
        if (!String(url).endsWith("/api/v1/auth/session")) return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
        if (failure === "network") throw new TypeError("fetch failed");
        if (failure === "invalid-json") return new Response("<html>proxy</html>");
        if (failure === "invalid-session") return Response.json({});
        return Response.json({ error: { message: "unavailable" } }, { status: failure });
      };
      await expect(api.syncBootstrap({ limit: 200 })).rejects.toMatchObject({ status: 401 });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(getCachedDesktopSession()).toMatchObject({ authenticated: true, user: session.user });
      expect(secureSessionToken).toBe(session.sessionToken);
      expect(events).toEqual([]);
    }
  });

  test("malformed session responses preserve the established account", async () => {
    await establishSession();
    for (const response of [{}, { authenticated: false }, null]) {
      globalThis.fetch = async () => Response.json(response);
      expect(await getWorkspaceSession()).toMatchObject({ authenticated: true, user: session.user });
      expect(secureSessionToken).toBe(session.sessionToken);
    }
    expect(events).toEqual([]);
  });

  test("first launch and a different instance cannot borrow an old local identity", async () => {
    await establishSession();
    clearCachedDesktopSession();
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await expect(getWorkspaceSession()).rejects.toMatchObject({ status: 503 });
    await establishSession();
    let rejectRequest;
    globalThis.fetch = () => new Promise((_, reject) => { rejectRequest = reject; });
    const pending = getWorkspaceSession();
    await new Promise(resolve => setTimeout(resolve, 0));
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://other.example.com");
    rejectRequest(new TypeError("fetch failed"));
    await expect(pending).rejects.toBeInstanceOf(TypeError);
    storage.set(DESKTOP_API_BASE_URL_STORAGE_KEY, "https://notes.example.com");
  });

  test("a delayed session rejection cannot clear a newly established credential", async () => {
    await establishSession();
    let finish;
    globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
    const pending = getWorkspaceSession();
    await new Promise(resolve => setTimeout(resolve, 0));
    await cacheDesktopSession({ ...session, sessionToken: "newer-offline-token" });
    finish(Response.json({ error: { code: "unauthorized" } }, { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(secureSessionToken).toBe("newer-offline-token");
    expect(getCachedDesktopSession()).toMatchObject({ authenticated: true, user: session.user });
    expect(events).toEqual([]);
  });

  test("replacement credentials do not reuse an older in-flight rejection confirmation", async () => {
    await establishSession();
    let finishOldConfirmation;
    let probes = 0;
    globalThis.fetch = async (url, init) => {
      if (!String(url).endsWith("/api/v1/auth/session")) return Response.json({ error: { code: "unauthorized" } }, { status: 401 });
      probes++;
      if (new Headers(init?.headers).get("Authorization") === `Bearer ${session.sessionToken}`) {
        return new Promise(resolve => { finishOldConfirmation = resolve; });
      }
      return new Response("unavailable", { status: 503 });
    };
    await expect(api.syncBootstrap({ limit: 200 })).rejects.toMatchObject({ status: 401 });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(finishOldConfirmation).toBeFunction();
    await cacheDesktopSession({ ...session, sessionToken: "replacement-during-confirmation" });
    await expect(api.syncBootstrap({ limit: 200 })).rejects.toMatchObject({ status: 401 });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(probes).toBe(2);
    finishOldConfirmation(Response.json({ authRequired: true, authenticated: false, demoMode: false, user: null }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(secureSessionToken).toBe("replacement-during-confirmation");
    expect(getCachedDesktopSession()).toMatchObject({ authenticated: true, user: session.user });
    expect(events).toEqual([]);
  });

  test("explicit session rejection still requires login and clears cached credentials", async () => {
    for (const status of [200, 401]) {
      await establishSession();
      globalThis.fetch = async () => status === 200
        ? Response.json({ authRequired: true, authenticated: false, demoMode: false, user: null })
        : Response.json({ error: { code: "unauthorized" } }, { status: 401 });
      expect((await getWorkspaceSession()).authenticated).toBe(false);
      expect(getCachedDesktopSession()).toBeNull();
      expect(secureSessionToken).toBe("");
      expect(events).toEqual([]);
    }
  });
});
