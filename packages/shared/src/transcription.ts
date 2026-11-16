import { z } from "zod";

/** Speech transcription talks to an OpenAI-compatible `/audio/transcriptions` endpoint. */
export type TranscriptionStandard = "openai-compatible";

export type TranscriptionModel = {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
};

export type TranscriptionProvider = {
  id: string;
  provider: TranscriptionStandard;
  displayName: string;
  baseUrl: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  models: TranscriptionModel[];
  credentialsUnavailable?: boolean;
};

export type TranscriptionSettings = {
  providers: TranscriptionProvider[];
  defaultModelId: string | null;
  enabled: boolean;
  encryptionConfigured: boolean;
  readOnly: boolean;
};

export const TranscriptionStandardSchema = z.enum(["openai-compatible"]);

const TranscriptionBaseUrlSchema = z.string().trim().min(1).max(500).superRefine((value, context) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    context.addIssue({ code: "custom", message: "Base URL must be a valid URL." });
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    context.addIssue({ code: "custom", message: "Base URL must use HTTP or HTTPS." });
  }
  if (url.username || url.password) {
    context.addIssue({ code: "custom", message: "Base URL must not contain credentials." });
  }
});

export const TranscriptionProviderCreateSchema = z.object({
  provider: TranscriptionStandardSchema.default("openai-compatible"),
  displayName: z.string().trim().min(1).max(80),
  baseUrl: TranscriptionBaseUrlSchema,
  apiKey: z.string().trim().min(1).max(4096),
  isEnabled: z.boolean().default(true),
  initialModelId: z.string().trim().min(1).max(200).optional(),
});

export const TranscriptionProviderUpdateSchema = z.object({
  provider: TranscriptionStandardSchema.default("openai-compatible"),
  displayName: z.string().trim().min(1).max(80),
  baseUrl: TranscriptionBaseUrlSchema,
  apiKey: z.string().trim().min(1).max(4096).optional(),
  isEnabled: z.boolean().default(true),
});

export const TranscriptionModelCreateSchema = z.object({
  modelId: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const TranscriptionDefaultModelUpdateSchema = z.object({
  modelConfigId: z.string().trim().min(1).nullable(),
});

export const normalizeTranscriptionBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");
