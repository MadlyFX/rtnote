import {
  normalizeTranscriptionBaseUrl,
  TranscriptionDefaultModelUpdateSchema,
  TranscriptionModelCreateSchema,
  TranscriptionProviderCreateSchema,
  TranscriptionProviderUpdateSchema,
} from "@edgeever/shared";
import { zValidator } from "@hono/zod-validator";
import type { Context, Hono } from "hono";
import type { AppContext, AppEnv, Bindings } from "./api-context";
import { AppError } from "./app-error";
import { auditStatement } from "./audit";
import { decryptStoredCredential, resolvePrimaryCredentialEncryptionKey } from "./credential-encryption";
import { createId, isoNow } from "./entity-utils";
import { apiError, forbidden, notFound } from "./http-errors";
import { getWorkspaceId, requireUser } from "./request-auth";
import { encryptSecret } from "./secret-encryption";
import { registerTranscriptionRelay } from "./transcription-relay";
import {
  getDefaultTranscriptionModelId,
  getTranscriptionModel,
  getTranscriptionProvider,
  getTranscriptionSettings,
  prepareNoteResourceTranscription,
  transcriptionDefaultStatement,
} from "./transcription-service";

// Speech transcription for audio and video attachments. The API paths and
// error codes keep their original `/ai/` and `ai_` names so installed clients
// keep working.

type TranscriptionRouteDependencies = {
  isDemoMode: (environment: Bindings) => boolean;
};

const encryptionConfigured = (context: AppContext) =>
  Boolean(resolvePrimaryCredentialEncryptionKey(context.env));

const readTranscriptionSettings = (context: AppContext, dependencies: TranscriptionRouteDependencies) =>
  getTranscriptionSettings(
    context.env.storage.db,
    getWorkspaceId(context),
    encryptionConfigured(context),
    dependencies.isDemoMode(context.env),
    context.env,
  );

const invalidTranscriptionSettings = (
  result: { success: boolean },
  context: Context,
) => {
  if (result.success) return;
  return apiError(
    context,
    "ai_transcription_request_invalid",
    "The speech transcription settings are invalid.",
    400,
  );
};

const denyMutation = (context: AppContext, dependencies: TranscriptionRouteDependencies) => {
  const denied = requireUser(context);
  if (denied) return denied;
  if (dependencies.isDemoMode(context.env)) {
    return forbidden(context, "Speech transcription settings cannot be changed in demo mode.");
  }
  return null;
};

const requireEncryptionKey = (context: AppContext) => {
  const key = resolvePrimaryCredentialEncryptionKey(context.env);
  if (!key) {
    throw new AppError(
      "ai_encryption_key_missing",
      "Credential encryption requires instance authentication or an optional EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY.",
      400,
    );
  }
  return key;
};

const providerErrorMessage = (error: unknown) => {
  if (error instanceof AppError) return error.message;
  if (!(error instanceof Error)) return "The speech service request failed.";
  return error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1000);
};

const withTranscriptionError = (context: AppContext, error: unknown, fallbackCode: string) => {
  if (error instanceof AppError) {
    return apiError(context, error.code, error.message, error.status);
  }
  return apiError(context, fallbackCode, providerErrorMessage(error), 400);
};

export const registerTranscriptionRoutes = (app: Hono<AppEnv>, dependencies: TranscriptionRouteDependencies) => {
  registerTranscriptionRelay(app);

  app.get("/api/v1/ai/transcription-settings", async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;
    return context.json(await readTranscriptionSettings(context, dependencies));
  });

  app.post("/api/v1/memos/:memoId/resources/:resourceId/transcription-target", async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;
    if (dependencies.isDemoMode(context.env)) {
      return forbidden(context, "Speech transcription is unavailable in demo mode.");
    }
    try {
      const target = await prepareNoteResourceTranscription(
        context.env,
        getWorkspaceId(context),
        context.req.param("memoId"),
        context.req.param("resourceId"),
      );
      context.header("Cache-Control", "no-store");
      return context.json(target);
    } catch (error) {
      return withTranscriptionError(context, error, "ai_transcription_failed");
    }
  });

  app.post("/api/v1/ai/transcription-providers/:providerId/direct-credential", async (context) => {
    const denied = requireUser(context);
    if (denied) return denied;
    if (dependencies.isDemoMode(context.env)) {
      return forbidden(context, "Speech transcription is unavailable in demo mode.");
    }
    try {
      const provider = await getTranscriptionProvider(
        context.env.storage.db,
        getWorkspaceId(context),
        context.req.param("providerId"),
      );
      if (!provider) return notFound(context, "Speech service not found.");
      const apiKey = await decryptStoredCredential(provider.api_key_encrypted, context.env);
      context.header("Cache-Control", "no-store");
      return context.json({ apiKey });
    } catch (error) {
      return withTranscriptionError(context, error, "ai_transcription_failed");
    }
  });

  app.post(
    "/api/v1/ai/transcription-providers",
    zValidator("json", TranscriptionProviderCreateSchema, invalidTranscriptionSettings),
    async (context) => {
      const denied = denyMutation(context, dependencies);
      if (denied) return denied;
      try {
        const input = context.req.valid("json");
        const workspaceId = getWorkspaceId(context);
        const providerId = createId("atp");
        const modelConfigId = input.initialModelId ? createId("atm") : null;
        const now = isoNow();
        const statements = [
          context.env.storage.db.prepare(
            `INSERT INTO ai_transcription_providers (
               id, workspace_id, provider, display_name, base_url, api_key_encrypted,
               is_enabled, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            providerId,
            workspaceId,
            input.provider,
            input.displayName,
            normalizeTranscriptionBaseUrl(input.baseUrl),
            await encryptSecret(input.apiKey, requireEncryptionKey(context)),
            input.isEnabled ? 1 : 0,
            now,
            now,
          ),
        ];
        if (modelConfigId && input.initialModelId) {
          statements.push(context.env.storage.db.prepare(
            `INSERT INTO ai_transcription_models (
               id, provider_id, model_id, display_name, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            modelConfigId,
            providerId,
            input.initialModelId,
            input.initialModelId.slice(0, 80),
            now,
            now,
          ));
          if (input.isEnabled && !(await getDefaultTranscriptionModelId(context.env.storage.db, workspaceId))) {
            statements.push(transcriptionDefaultStatement(
              context.env.storage.db,
              workspaceId,
              modelConfigId,
              now,
            ));
          }
        }
        statements.push(auditStatement(
          context.env.storage.db,
          "user",
          context.get("auth").actorId,
          "workspace.ai_transcription_provider.create",
          "ai_transcription_provider",
          providerId,
          { isEnabled: input.isEnabled, provider: input.provider, modelId: input.initialModelId ?? null },
        ));
        await context.env.storage.db.batch(statements);
        return context.json(await readTranscriptionSettings(context, dependencies), 201);
      } catch (error) {
        return withTranscriptionError(context, error, "ai_transcription_provider_create_failed");
      }
    },
  );

  app.put(
    "/api/v1/ai/transcription-providers/:providerId",
    zValidator("json", TranscriptionProviderUpdateSchema, invalidTranscriptionSettings),
    async (context) => {
      const denied = denyMutation(context, dependencies);
      if (denied) return denied;
      try {
        const input = context.req.valid("json");
        const providerId = context.req.param("providerId");
        const workspaceId = getWorkspaceId(context);
        const existing = await getTranscriptionProvider(context.env.storage.db, workspaceId, providerId);
        if (!existing) return notFound(context, "Speech service not found.");
        const now = isoNow();
        const apiKeyEncrypted = input.apiKey
          ? await encryptSecret(input.apiKey, requireEncryptionKey(context))
          : existing.api_key_encrypted;
        await context.env.storage.db.batch([
          context.env.storage.db.prepare(
            `UPDATE ai_transcription_providers SET
               provider = ?, display_name = ?, base_url = ?, api_key_encrypted = ?,
               is_enabled = ?, updated_at = ?
             WHERE id = ? AND workspace_id = ?`,
          ).bind(
            input.provider,
            input.displayName,
            normalizeTranscriptionBaseUrl(input.baseUrl),
            apiKeyEncrypted,
            input.isEnabled ? 1 : 0,
            now,
            providerId,
            workspaceId,
          ),
          auditStatement(
            context.env.storage.db,
            "user",
            context.get("auth").actorId,
            "workspace.ai_transcription_provider.update",
            "ai_transcription_provider",
            providerId,
            { isEnabled: input.isEnabled, provider: input.provider, apiKeyUpdated: Boolean(input.apiKey) },
          ),
        ]);
        return context.json(await readTranscriptionSettings(context, dependencies));
      } catch (error) {
        return withTranscriptionError(context, error, "ai_transcription_provider_update_failed");
      }
    },
  );

  app.delete("/api/v1/ai/transcription-providers/:providerId", async (context) => {
    const denied = denyMutation(context, dependencies);
    if (denied) return denied;
    const providerId = context.req.param("providerId");
    const workspaceId = getWorkspaceId(context);
    const existing = await getTranscriptionProvider(context.env.storage.db, workspaceId, providerId);
    if (!existing) return notFound(context, "Speech service not found.");
    await context.env.storage.db.batch([
      context.env.storage.db.prepare(
        `DELETE FROM ai_transcription_providers WHERE id = ? AND workspace_id = ?`,
      ).bind(providerId, workspaceId),
      auditStatement(
        context.env.storage.db,
        "user",
        context.get("auth").actorId,
        "workspace.ai_transcription_provider.delete",
        "ai_transcription_provider",
        providerId,
        {},
      ),
    ]);
    return context.json(await readTranscriptionSettings(context, dependencies));
  });

  app.post(
    "/api/v1/ai/transcription-providers/:providerId/models",
    zValidator("json", TranscriptionModelCreateSchema, invalidTranscriptionSettings),
    async (context) => {
      const denied = denyMutation(context, dependencies);
      if (denied) return denied;
      const providerId = context.req.param("providerId");
      const workspaceId = getWorkspaceId(context);
      const provider = await getTranscriptionProvider(context.env.storage.db, workspaceId, providerId);
      if (!provider) return notFound(context, "Speech service not found.");
      const input = context.req.valid("json");
      const modelConfigId = createId("atm");
      const now = isoNow();
      const statements = [
        context.env.storage.db.prepare(
          `INSERT INTO ai_transcription_models (
             id, provider_id, model_id, display_name, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(
          modelConfigId,
          providerId,
          input.modelId,
          input.displayName ?? input.modelId.slice(0, 80),
          now,
          now,
        ),
      ];
      if (provider.is_enabled && !(await getDefaultTranscriptionModelId(context.env.storage.db, workspaceId))) {
        statements.push(transcriptionDefaultStatement(
          context.env.storage.db,
          workspaceId,
          modelConfigId,
          now,
        ));
      }
      statements.push(auditStatement(
        context.env.storage.db,
        "user",
        context.get("auth").actorId,
        "workspace.ai_transcription_model.create",
        "ai_transcription_model",
        modelConfigId,
        { providerId, modelId: input.modelId },
      ));
      try {
        await context.env.storage.db.batch(statements);
        return context.json(await readTranscriptionSettings(context, dependencies), 201);
      } catch (error) {
        return withTranscriptionError(context, error, "ai_transcription_model_create_failed");
      }
    },
  );

  app.delete(
    "/api/v1/ai/transcription-providers/:providerId/models/:modelConfigId",
    async (context) => {
      const denied = denyMutation(context, dependencies);
      if (denied) return denied;
      const workspaceId = getWorkspaceId(context);
      const providerId = context.req.param("providerId");
      const modelConfigId = context.req.param("modelConfigId");
      const model = await getTranscriptionModel(context.env.storage.db, workspaceId, modelConfigId);
      if (!model || model.provider_id !== providerId) {
        return notFound(context, "Speech model not found.");
      }
      await context.env.storage.db.batch([
        context.env.storage.db.prepare(
          `DELETE FROM ai_transcription_models WHERE id = ? AND provider_id = ?`,
        ).bind(modelConfigId, providerId),
        auditStatement(
          context.env.storage.db,
          "user",
          context.get("auth").actorId,
          "workspace.ai_transcription_model.delete",
          "ai_transcription_model",
          modelConfigId,
          { providerId, modelId: model.model_id },
        ),
      ]);
      return context.json(await readTranscriptionSettings(context, dependencies));
    },
  );

  app.put(
    "/api/v1/ai/transcription-default-model",
    zValidator("json", TranscriptionDefaultModelUpdateSchema, invalidTranscriptionSettings),
    async (context) => {
      const denied = denyMutation(context, dependencies);
      if (denied) return denied;
      const input = context.req.valid("json");
      const workspaceId = getWorkspaceId(context);
      if (input.modelConfigId) {
        const model = await context.env.storage.db.prepare(
          `SELECT models.id
           FROM ai_transcription_models AS models
           JOIN ai_transcription_providers AS providers ON providers.id = models.provider_id
           WHERE models.id = ? AND providers.workspace_id = ? AND providers.is_enabled = 1
           LIMIT 1`,
        ).bind(input.modelConfigId, workspaceId).first<{ id: string }>();
        if (!model) {
          return apiError(
            context,
            "ai_transcription_default_unavailable",
            "The selected speech model belongs to a disabled or missing service.",
            400,
          );
        }
      }
      const now = isoNow();
      await context.env.storage.db.batch([
        transcriptionDefaultStatement(context.env.storage.db, workspaceId, input.modelConfigId, now),
        auditStatement(
          context.env.storage.db,
          "user",
          context.get("auth").actorId,
          "workspace.ai_transcription_default.update",
          "workspace",
          workspaceId,
          { modelConfigId: input.modelConfigId },
        ),
      ]);
      return context.json(await readTranscriptionSettings(context, dependencies));
    },
  );
};
