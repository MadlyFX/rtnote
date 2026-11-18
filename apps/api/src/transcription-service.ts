import {
  normalizeTranscriptionBaseUrl,
  type TranscriptionModel,
  type TranscriptionProvider,
  type TranscriptionSettings,
  type TranscriptionStandard,
} from "@edgeever/shared";
import type { Bindings } from "./api-context";
import { AppError } from "./app-error";
import { decryptStoredCredential, type CredentialEnvironment } from "./credential-encryption";
import { getResourceRow } from "./resource-service";
import type { DatabaseAdapter } from "./storage-contract";

// Table names keep their original `ai_transcription_` prefix: renaming them
// would need a data migration for no user-visible gain.

export type TranscriptionProviderRow = {
  id: string;
  workspace_id: string;
  provider: TranscriptionStandard;
  display_name: string;
  base_url: string;
  api_key_encrypted: string;
  is_enabled: number;
  created_at: string;
  updated_at: string;
};

export type TranscriptionModelRow = {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

const selectProviderSql = `SELECT
  id, workspace_id, provider, display_name, base_url, api_key_encrypted, is_enabled, created_at, updated_at
  FROM ai_transcription_providers`;

const selectModelSql = `SELECT
  id, provider_id, model_id, display_name, created_at, updated_at
  FROM ai_transcription_models`;

export const getTranscriptionProvider = (
  db: DatabaseAdapter,
  workspaceId: string,
  providerId: string,
) => db.prepare(
  `${selectProviderSql} WHERE id = ? AND workspace_id = ? LIMIT 1`,
).bind(providerId, workspaceId).first<TranscriptionProviderRow>();

export const getTranscriptionModel = (
  db: DatabaseAdapter,
  workspaceId: string,
  modelConfigId: string,
) => db.prepare(
  `${selectModelSql}
   WHERE id = ? AND provider_id IN (
     SELECT id FROM ai_transcription_providers WHERE workspace_id = ?
   )
   LIMIT 1`,
).bind(modelConfigId, workspaceId).first<TranscriptionModelRow>();

export const getDefaultTranscriptionModelId = async (db: DatabaseAdapter, workspaceId: string) => {
  const row = await db.prepare(
    `SELECT default_model_id
     FROM ai_transcription_workspace_settings
     WHERE workspace_id = ?
     LIMIT 1`,
  ).bind(workspaceId).first<{ default_model_id: string | null }>();
  return row?.default_model_id ?? null;
};

export const transcriptionDefaultStatement = (
  db: DatabaseAdapter,
  workspaceId: string,
  modelConfigId: string | null,
  now: string,
) => db.prepare(
  `INSERT INTO ai_transcription_workspace_settings (
     workspace_id, default_model_id, created_at, updated_at
   ) VALUES (?, ?, ?, ?)
   ON CONFLICT(workspace_id) DO UPDATE SET
     default_model_id = excluded.default_model_id,
     updated_at = excluded.updated_at`,
).bind(workspaceId, modelConfigId, now, now);

const mapModel = (row: TranscriptionModelRow): TranscriptionModel => ({
  id: row.id,
  providerId: row.provider_id,
  modelId: row.model_id,
  displayName: row.display_name,
});

const mapProvider = (
  row: TranscriptionProviderRow,
  models: TranscriptionModelRow[],
  credentialsUnavailable = false,
): TranscriptionProvider => ({
  id: row.id,
  provider: row.provider,
  displayName: row.display_name,
  baseUrl: row.base_url,
  isEnabled: Boolean(row.is_enabled),
  hasApiKey: Boolean(row.api_key_encrypted),
  models: models.filter((model) => model.provider_id === row.id).map(mapModel),
  ...(credentialsUnavailable ? { credentialsUnavailable: true } : {}),
});

const withCredentialAvailability = async (
  row: TranscriptionProviderRow,
  models: TranscriptionModelRow[],
  encryptionConfigured: boolean,
  environment?: CredentialEnvironment,
): Promise<TranscriptionProvider> => {
  const mapped = mapProvider(row, models);
  if (!encryptionConfigured || !environment || !row.api_key_encrypted) return mapped;
  try {
    await decryptStoredCredential(row.api_key_encrypted, environment);
    return mapped;
  } catch {
    return mapProvider(row, models, true);
  }
};

export const getTranscriptionSettings = async (
  db: DatabaseAdapter,
  workspaceId: string,
  encryptionConfigured: boolean,
  readOnly: boolean,
  environment?: CredentialEnvironment,
): Promise<TranscriptionSettings> => {
  const [providersResult, modelsResult, defaultModelId] = await Promise.all([
    db.prepare(
      `${selectProviderSql} WHERE workspace_id = ? ORDER BY created_at ASC, id ASC`,
    ).bind(workspaceId).all<TranscriptionProviderRow>(),
    db.prepare(
      `${selectModelSql}
       WHERE provider_id IN (
         SELECT id FROM ai_transcription_providers WHERE workspace_id = ?
       )
       ORDER BY created_at ASC, id ASC`,
    ).bind(workspaceId).all<TranscriptionModelRow>(),
    getDefaultTranscriptionModelId(db, workspaceId),
  ]);
  const providers = await Promise.all(providersResult.results.map((provider) =>
    withCredentialAvailability(provider, modelsResult.results, encryptionConfigured, environment)));
  const defaultProvider = providers.find((provider) =>
    provider.models.some((model) => model.id === defaultModelId));
  const enabled = Boolean(
    encryptionConfigured
    && defaultProvider?.isEnabled
    && defaultProvider.hasApiKey
    && !defaultProvider.credentialsUnavailable
    && defaultProvider.models.some((model) => model.id === defaultModelId && model.modelId),
  );
  return {
    providers,
    defaultModelId,
    enabled,
    encryptionConfigured,
    readOnly,
  };
};

export const prepareTranscriptionCredentials = async (
  db: DatabaseAdapter,
  workspaceId: string,
  environment: CredentialEnvironment,
) => {
  const row = await db.prepare(
    `SELECT
       models.model_id,
       providers.provider,
       providers.base_url,
       providers.api_key_encrypted
     FROM ai_transcription_workspace_settings AS settings
     JOIN ai_transcription_models AS models ON models.id = settings.default_model_id
     JOIN ai_transcription_providers AS providers ON providers.id = models.provider_id
     WHERE settings.workspace_id = ?
       AND providers.workspace_id = ?
       AND providers.is_enabled = 1
     LIMIT 1`,
  ).bind(workspaceId, workspaceId).first<{
    model_id: string;
    provider: TranscriptionStandard;
    base_url: string;
    api_key_encrypted: string;
  }>();
  if (!row?.base_url || !row.model_id || !row.api_key_encrypted || !row.provider) {
    return { enabled: false as const };
  }
  try {
    return {
      enabled: true as const,
      provider: row.provider,
      baseUrl: normalizeTranscriptionBaseUrl(row.base_url),
      modelId: row.model_id,
      apiKey: await decryptStoredCredential(row.api_key_encrypted, environment),
    };
  } catch {
    return { enabled: false as const };
  }
};

const SUPPORTED_EXTENSIONS = new Set(["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]);

export const isTranscribableAttachment = (resource: {
  kind: string;
  mime_type: string | null;
  filename: string | null;
}) => {
  if (resource.kind !== "attachment") return false;
  const extension = /\.([a-z0-9]+)$/i.exec(resource.filename ?? "")?.[1]?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) return false;
  const mime = (resource.mime_type ?? "").toLowerCase();
  return mime.startsWith("audio/") || mime === "video/mp4" || mime === "video/webm";
};

export const prepareNoteResourceTranscription = async (
  env: Bindings,
  workspaceId: string,
  memoId: string,
  resourceId: string,
) => {
  const resource = await getResourceRow(env.storage.db, workspaceId, resourceId);
  if (!resource || resource.memo_id !== memoId) {
    throw new AppError("resource_not_found", "This attachment does not belong to the note.", 404);
  }
  if (!isTranscribableAttachment(resource)) {
    throw new AppError("unsupported_media_type", "Choose an audio or MP4/WebM video attachment.", 415);
  }
  if (resource.byte_size < 1) {
    throw new AppError("empty_audio", "The attachment is empty.", 413);
  }
  const credentials = await prepareTranscriptionCredentials(env.storage.db, workspaceId, env);
  if (!credentials.enabled) {
    throw new AppError("ai_transcription_not_configured", "Choose a default speech model first.", 409);
  }

  return {
    baseUrl: credentials.baseUrl,
    modelId: credentials.modelId,
    apiKey: credentials.apiKey,
    resourceId,
    filename: resource.filename ?? "",
  };
};
