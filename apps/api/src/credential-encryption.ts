import { AppError } from "./app-error";
import { decryptSecret } from "./secret-encryption";

export const resolveCredentialEncryptionKey = (value: string | undefined) => {
  const key = value?.trim();
  return key || undefined;
};

export type CredentialEnvironment = {
  EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY?: string;
  EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS?: string;
  EDGE_EVER_STORAGE_ENCRYPTION_KEY?: string;
  EDGE_EVER_AUTH_PASSWORD?: string;
  EDGE_EVER_AUTH_PASSWORD_HASH?: string;
  EDGE_EVER_AUTH_PASSWORD_FALLBACK?: string;
};

const uniqueKeys = (values: Array<string | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

// The "ai-credentials" label is part of the stored ciphertext's key derivation.
// Speech service keys saved by earlier versions were encrypted under it, so it
// must not change.
const deriveCredentialKey = (value: string | undefined) => value
  ? `edgeever:ai-credentials:v1:${value}`
  : undefined;

/**
 * Authentication is already required by a normal RTNote deployment, so its
 * stable deployment secret is the zero-configuration credential-encryption
 * root. A dedicated key is an optional advanced override. The legacy storage
 * key remains in the decryption ring for credentials saved before v1.15.
 */
export const resolveCredentialEncryptionKeys = (environment: CredentialEnvironment) => uniqueKeys([
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_AUTH_PASSWORD)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_AUTH_PASSWORD_HASH)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_AUTH_PASSWORD_FALLBACK)),
  resolveCredentialEncryptionKey(environment.EDGE_EVER_STORAGE_ENCRYPTION_KEY),
]);

export const resolvePrimaryCredentialEncryptionKey = (environment: CredentialEnvironment) => [
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_AUTH_PASSWORD)),
  deriveCredentialKey(resolveCredentialEncryptionKey(environment.EDGE_EVER_AUTH_PASSWORD_HASH)),
].find(Boolean);

export const decryptStoredCredential = async (
  encryptedValue: string,
  environment: CredentialEnvironment,
) => {
  for (const key of resolveCredentialEncryptionKeys(environment)) {
    try {
      return await decryptSecret(encryptedValue, key);
    } catch {
      // Try the next key so credentials encrypted by the legacy OSS key remain usable.
    }
  }
  // Error codes stay as they were so installed clients keep matching them.
  throw new AppError(
    "ai_credentials_unavailable",
    "The saved credential cannot be decrypted. Restore the deployment authentication secret or credential encryption key.",
    503,
  );
};
