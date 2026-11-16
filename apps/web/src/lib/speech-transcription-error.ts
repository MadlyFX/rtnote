import { ApiRequestError } from "@/lib/api";

export class SpeechProviderReachabilityError extends Error {
  readonly code = "speech_provider_direct_unreachable";

  constructor(readonly platform: "browser" | "desktop") {
    super("The client could not reach the speech provider directly.");
    this.name = "SpeechProviderReachabilityError";
  }
}

export const trimSpeechText = (value: string | null | undefined) => (value ?? "").trim();

/** Speech settings keep the server's original credential error codes. */
export const speechSettingsErrorMessage = (
  error: unknown,
  fallback: string,
  encryptionMessage: string,
  unavailableMessage = encryptionMessage,
) => {
  if (error instanceof ApiRequestError && error.code === "ai_encryption_key_missing") return encryptionMessage;
  if (error instanceof ApiRequestError && error.code === "ai_credentials_unavailable") return unavailableMessage;
  return error instanceof Error ? error.message : fallback;
};
