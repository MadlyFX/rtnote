import { describe, expect, test } from "bun:test";
import { globSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { registerTranscriptionRoutes } from "./transcription-routes.ts";

const auth = {
  kind: "user",
  actorType: "user",
  actorId: "usr_member",
  username: "member",
  displayName: "Member",
  scopes: [],
  workspaceId: "ws_member",
  role: "member",
};

const environment = {
  storage: {
    db: {
      prepare: () => { throw new Error("Unexpected database access"); },
      batch: async () => [],
    },
    resources: {},
  },
  RTNOTE_AUTH_PASSWORD: "x".repeat(32),
};

class SqliteD1PreparedStatement {
  constructor(db, sql, bindings = []) {
    this.db = db;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new SqliteD1PreparedStatement(this.db, this.sql, bindings);
  }

  async all() {
    return { results: this.db.query(this.sql).all(...this.bindings), success: true, meta: {} };
  }

  async first() {
    return this.db.query(this.sql).get(...this.bindings) ?? null;
  }

  async run() {
    const result = this.db.query(this.sql).run(...this.bindings);
    return { success: true, meta: { changes: result.changes } };
  }
}

class SqliteD1Database {
  constructor(db) {
    this.db = db;
  }

  prepare(sql) {
    return new SqliteD1PreparedStatement(this.db, sql);
  }

  async batch(statements) {
    return this.db.transaction(() => statements.map((statement) =>
      this.db.query(statement.sql).run(...statement.bindings)))();
  }
}

const createDatabaseEnvironment = () => {
  const sqlite = new Database(":memory:");
  for (const migration of globSync("migrations/*.sql").sort()) {
    sqlite.exec(readFileSync(migration, "utf8"));
  }
  sqlite.query("INSERT INTO workspaces (id, name, is_personal) VALUES (?, ?, 1)")
    .run("ws_member", "Member workspace");
  return {
    sqlite,
    environment: {
      storage: { db: new SqliteD1Database(sqlite), resources: {} },
      RTNOTE_AUTH_PASSWORD: "x".repeat(32),
    },
  };
};

const createApp = ({ currentAuth = auth, demoMode = false } = {}) => {
  const app = new Hono();
  app.use("/api/v1/*", async (context, next) => {
    context.set("auth", currentAuth);
    await next();
  });
  registerTranscriptionRoutes(app, { isDemoMode: () => demoMode });
  return app;
};

const validSettings = {
  provider: "openai-compatible",
  displayName: "Cloud model",
  baseUrl: "https://models.example.com/v1",
  apiKey: "secret",
  isEnabled: true,
  initialModelId: "model-a",
};

const jsonRequest = (method, body) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const transcriptionSettings = {
  provider: "openai-compatible",
  displayName: "Speech",
  baseUrl: "https://speech.example.com/v1",
  apiKey: "speech-secret",
  isEnabled: true,
};

const createTranscriptionProvider = async (app, databaseEnvironment, overrides = {}) => {
  const response = await app.request(
    "/api/v1/ai/transcription-providers",
    jsonRequest("POST", { ...transcriptionSettings, ...overrides }),
    databaseEnvironment,
  );
  expect(response.status).toBe(201);
  return response.json();
};

const auditActionsOf = (sqlite) =>
  sqlite.query("SELECT action FROM audit_events ORDER BY rowid").all().map((row) => row.action);

const otherWorkspaceAuth = { ...auth, actorId: "usr_other", workspaceId: "ws_other" };
const agentAuth = { ...auth, kind: "agent", actorType: "agent", scopes: ["read:resources"] };


describe("speech transcription route contracts", () => {
  test("speech settings stay encrypted and transcription requires a note-owned resource", async () => {
    const app = createApp();
    const { environment: databaseEnvironment } = createDatabaseEnvironment();
    const saved = await app.request(
      "/api/v1/ai/transcription-providers",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validSettings, initialModelId: "whisper-1" }),
      },
      databaseEnvironment,
    );
    expect(saved.status).toBe(201);
    const settings = await saved.json();
    expect(JSON.stringify(settings)).not.toContain("secret");

    const credentialPath = `/api/v1/ai/transcription-providers/${settings.providers[0].id}/direct-credential`;
    const credential = await app.request(credentialPath, { method: "POST" }, databaseEnvironment);
    expect(credential.status).toBe(200);
    expect(credential.headers.get("Cache-Control")).toBe("no-store");
    expect(await credential.json()).toEqual({ apiKey: "secret" });

    const transcript = await app.request(
      "/api/v1/memos/missing/resources/missing/transcription-target",
      { method: "POST" },
      databaseEnvironment,
    );
    expect(transcript.status).toBe(404);

    const scopedApp = createApp({ currentAuth: { ...auth, kind: "agent", scopes: ["read:resources"] } });
    const denied = await scopedApp.request(
      "/api/v1/memos/missing/resources/missing/transcription-target",
      { method: "POST" },
      databaseEnvironment,
    );
    expect(denied.status).toBe(403);
    const deniedCredential = await scopedApp.request(credentialPath, { method: "POST" }, databaseEnvironment);
    expect(deniedCredential.status).toBe(403);
    const otherWorkspaceApp = createApp({ currentAuth: { ...auth, workspaceId: "ws_other" } });
    const otherWorkspaceCredential = await otherWorkspaceApp.request(credentialPath, { method: "POST" }, databaseEnvironment);
    expect(otherWorkspaceCredential.status).toBe(404);
  });
});

describe("speech transcription settings routes", () => {
  test("rejects invalid transcription settings with a dedicated error code", async () => {
    const response = await createApp().request(
      "/api/v1/ai/transcription-providers",
      jsonRequest("POST", { ...transcriptionSettings, displayName: "" }),
      environment,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "ai_transcription_request_invalid",
        message: "The speech transcription settings are invalid.",
      },
    });
  });

  test("requires an interactive user to read transcription settings", async () => {
    const response = await createApp({ currentAuth: agentAuth }).request(
      "/api/v1/ai/transcription-settings",
      {},
      environment,
    );
    expect(response.status).toBe(403);
  });

  test("refuses transcription credentials and targets in demo mode", async () => {
    const app = createApp({ demoMode: true });
    const target = await app.request("/api/v1/memos/m/resources/r/transcription-target", { method: "POST" }, environment);
    const credential = await app.request(
      "/api/v1/ai/transcription-providers/atp_x/direct-credential",
      { method: "POST" },
      environment,
    );
    expect(target.status).toBe(403);
    expect(credential.status).toBe(403);
  });

  test("returns 404 for an unknown speech provider credential", async () => {
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const response = await createApp().request(
      "/api/v1/ai/transcription-providers/atp_missing/direct-credential",
      { method: "POST" },
      databaseEnvironment,
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { message: "Speech service not found." } });
    sqlite.close();
  });

  test("fails closed when no credential encryption key is configured", async () => {
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const { RTNOTE_AUTH_PASSWORD: _password, ...withoutKey } = databaseEnvironment;
    const response = await createApp().request(
      "/api/v1/ai/transcription-providers",
      jsonRequest("POST", transcriptionSettings),
      withoutKey,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "ai_encryption_key_missing" } });
    expect(sqlite.query("SELECT COUNT(*) AS count FROM ai_transcription_providers").get().count).toBe(0);
    sqlite.close();
  });

  test("manages providers, models and the default model inside one workspace", async () => {
    const app = createApp();
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    sqlite.query("INSERT INTO workspaces (id, name, is_personal) VALUES (?, ?, 1)").run("ws_other", "Other");

    const created = await createTranscriptionProvider(app, databaseEnvironment);
    expect(created.providers).toHaveLength(1);
    expect(created.providers[0].models).toEqual([]);
    expect(created.defaultModelId).toBeNull();
    expect(JSON.stringify(created)).not.toContain("speech-secret");
    const providerId = created.providers[0].id;

    const addModel = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}/models`,
      jsonRequest("POST", { modelId: "whisper-1" }),
      databaseEnvironment,
    );
    expect(addModel.status).toBe(201);
    const withModel = await addModel.json();
    const model = withModel.providers[0].models[0];
    expect(model).toMatchObject({ modelId: "whisper-1", displayName: "whisper-1" });
    // The first model of an enabled service becomes the workspace default.
    expect(withModel.defaultModelId).toBe(model.id);
    expect(withModel.enabled).toBe(true);

    const second = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}/models`,
      jsonRequest("POST", { modelId: "whisper-large", displayName: "Large" }),
      databaseEnvironment,
    );
    const withTwo = await second.json();
    expect(withTwo.defaultModelId).toBe(model.id);
    const secondModel = withTwo.providers[0].models.find((entry) => entry.modelId === "whisper-large");
    expect(secondModel.displayName).toBe("Large");

    const switchDefault = await app.request(
      "/api/v1/ai/transcription-default-model",
      jsonRequest("PUT", { modelConfigId: secondModel.id }),
      databaseEnvironment,
    );
    expect(switchDefault.status).toBe(200);
    expect((await switchDefault.json()).defaultModelId).toBe(secondModel.id);

    const clearDefault = await app.request(
      "/api/v1/ai/transcription-default-model",
      jsonRequest("PUT", { modelConfigId: null }),
      databaseEnvironment,
    );
    expect(clearDefault.status).toBe(200);
    expect((await clearDefault.json()).defaultModelId).toBeNull();

    // Another workspace can neither see nor select these models.
    const otherApp = createApp({ currentAuth: otherWorkspaceAuth });
    const foreignDefault = await otherApp.request(
      "/api/v1/ai/transcription-default-model",
      jsonRequest("PUT", { modelConfigId: secondModel.id }),
      databaseEnvironment,
    );
    expect(foreignDefault.status).toBe(400);
    expect(await foreignDefault.json()).toMatchObject({ error: { code: "ai_transcription_default_unavailable" } });
    const foreignSettings = await (await otherApp.request("/api/v1/ai/transcription-settings", {}, databaseEnvironment)).json();
    expect(foreignSettings.providers).toEqual([]);
    for (const [path, init] of [
      [`/api/v1/ai/transcription-providers/${providerId}`, jsonRequest("PUT", transcriptionSettings)],
      [`/api/v1/ai/transcription-providers/${providerId}`, { method: "DELETE" }],
      [`/api/v1/ai/transcription-providers/${providerId}/models`, jsonRequest("POST", { modelId: "x" })],
      [`/api/v1/ai/transcription-providers/${providerId}/models/${model.id}`, { method: "DELETE" }],
      [`/api/v1/ai/transcription-providers/${providerId}/direct-credential`, { method: "POST" }],
    ]) {
      const response = await otherApp.request(path, init, databaseEnvironment);
      expect(response.status, `${init.method} ${path}`).toBe(404);
    }

    const wrongProvider = await app.request(
      `/api/v1/ai/transcription-providers/atp_other/models/${model.id}`,
      { method: "DELETE" },
      databaseEnvironment,
    );
    expect(wrongProvider.status).toBe(404);
    expect(await wrongProvider.json()).toMatchObject({ error: { message: "Speech model not found." } });

    const removeModel = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}/models/${model.id}`,
      { method: "DELETE" },
      databaseEnvironment,
    );
    expect(removeModel.status).toBe(200);
    expect((await removeModel.json()).providers[0].models.map((entry) => entry.modelId)).toEqual(["whisper-large"]);

    const removeProvider = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}`,
      { method: "DELETE" },
      databaseEnvironment,
    );
    expect(removeProvider.status).toBe(200);
    expect((await removeProvider.json()).providers).toEqual([]);

    expect(auditActionsOf(sqlite)).toEqual([
      "workspace.ai_transcription_provider.create",
      "workspace.ai_transcription_model.create",
      "workspace.ai_transcription_model.create",
      "workspace.ai_transcription_default.update",
      "workspace.ai_transcription_default.update",
      "workspace.ai_transcription_model.delete",
      "workspace.ai_transcription_provider.delete",
    ]);
    sqlite.close();
  });

  test("updates a speech provider and keeps the stored key unless a new one is sent", async () => {
    const app = createApp();
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const created = await createTranscriptionProvider(app, databaseEnvironment, { initialModelId: "whisper-1" });
    const providerId = created.providers[0].id;
    const credentialPath = `/api/v1/ai/transcription-providers/${providerId}/direct-credential`;

    const renamed = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}`,
      jsonRequest("PUT", { ...transcriptionSettings, apiKey: undefined, displayName: "Renamed", isEnabled: false }),
      databaseEnvironment,
    );
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).providers[0]).toMatchObject({ displayName: "Renamed", isEnabled: false });
    expect(await (await app.request(credentialPath, { method: "POST" }, databaseEnvironment)).json())
      .toEqual({ apiKey: "speech-secret" });

    // A model of a disabled service cannot become the default.
    const disabledDefault = await app.request(
      "/api/v1/ai/transcription-default-model",
      jsonRequest("PUT", { modelConfigId: created.providers[0].models[0].id }),
      databaseEnvironment,
    );
    expect(disabledDefault.status).toBe(400);

    const rekeyed = await app.request(
      `/api/v1/ai/transcription-providers/${providerId}`,
      jsonRequest("PUT", { ...transcriptionSettings, apiKey: "rotated-secret" }),
      databaseEnvironment,
    );
    expect(rekeyed.status).toBe(200);
    expect(await (await app.request(credentialPath, { method: "POST" }, databaseEnvironment)).json())
      .toEqual({ apiKey: "rotated-secret" });
    const stored = sqlite.query("SELECT api_key_encrypted FROM ai_transcription_providers WHERE id = ?").get(providerId);
    expect(stored.api_key_encrypted).not.toContain("rotated-secret");

    const metadata = sqlite.query(
      "SELECT metadata_json FROM audit_events WHERE action = 'workspace.ai_transcription_provider.update' ORDER BY rowid",
    ).all().map((row) => JSON.parse(row.metadata_json).apiKeyUpdated);
    expect(metadata).toEqual([false, true]);

    const missing = await app.request(
      "/api/v1/ai/transcription-providers/atp_missing",
      jsonRequest("PUT", transcriptionSettings),
      databaseEnvironment,
    );
    expect(missing.status).toBe(404);
    sqlite.close();
  });

  test("blocks speech setting changes in demo mode and for API tokens", async () => {
    for (const app of [createApp({ demoMode: true }), createApp({ currentAuth: agentAuth })]) {
      for (const [path, init] of [
        ["/api/v1/ai/transcription-providers", jsonRequest("POST", transcriptionSettings)],
        ["/api/v1/ai/transcription-providers/atp_x", jsonRequest("PUT", transcriptionSettings)],
        ["/api/v1/ai/transcription-providers/atp_x", { method: "DELETE" }],
        ["/api/v1/ai/transcription-providers/atp_x/models", jsonRequest("POST", { modelId: "m" })],
        ["/api/v1/ai/transcription-providers/atp_x/models/atm_x", { method: "DELETE" }],
        ["/api/v1/ai/transcription-default-model", jsonRequest("PUT", { modelConfigId: null })],
      ]) {
        const response = await app.request(path, init, environment);
        expect(response.status, `${init.method} ${path}`).toBe(403);
      }
    }
  });
});

describe("speech settings storage failures", () => {
  test("rejects duplicate speech model ids without changing the stored models", async () => {
    const app = createApp();
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const speech = (await createTranscriptionProvider(app, databaseEnvironment, { initialModelId: "whisper-1" })).providers[0];
    const duplicateSpeech = await app.request(
      `/api/v1/ai/transcription-providers/${speech.id}/models`,
      jsonRequest("POST", { modelId: "whisper-1" }),
      databaseEnvironment,
    );
    expect(duplicateSpeech.status).toBe(400);
    expect(await duplicateSpeech.json()).toMatchObject({ error: { code: "ai_transcription_model_create_failed" } });
    expect(sqlite.query("SELECT COUNT(*) AS count FROM ai_transcription_models").get().count).toBe(1);
    expect(auditActionsOf(sqlite).filter((action) => action.endsWith("model.create"))).toEqual([]);
    sqlite.close();
  });

  test("refuses to rotate keys when the encryption key is no longer configured", async () => {
    const app = createApp();
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const speech = (await createTranscriptionProvider(app, databaseEnvironment)).providers[0];
    const { RTNOTE_AUTH_PASSWORD: _password, ...withoutKey } = databaseEnvironment;
    const speechUpdate = await app.request(
      `/api/v1/ai/transcription-providers/${speech.id}`,
      jsonRequest("PUT", { ...transcriptionSettings, apiKey: "rotated" }),
      withoutKey,
    );
    expect(speechUpdate.status).toBe(400);
    expect(await speechUpdate.json()).toMatchObject({ error: { code: "ai_encryption_key_missing" } });
    sqlite.close();
  });

  test("reports an undecryptable speech credential instead of returning it", async () => {
    const app = createApp();
    const { sqlite, environment: databaseEnvironment } = createDatabaseEnvironment();
    const speech = (await createTranscriptionProvider(app, databaseEnvironment)).providers[0];
    sqlite.query("UPDATE ai_transcription_providers SET api_key_encrypted = ? WHERE id = ?").run("corrupted", speech.id);

    const response = await app.request(
      `/api/v1/ai/transcription-providers/${speech.id}/direct-credential`,
      { method: "POST" },
      databaseEnvironment,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "ai_credentials_unavailable" } });
    sqlite.close();
  });
});
