import { describe, expect, test } from "bun:test";
import {
  decryptStoredCredential,
  resolveCredentialEncryptionKey,
  resolveCredentialEncryptionKeys,
  resolvePrimaryCredentialEncryptionKey,
} from "./credential-encryption.ts";
import { encryptSecret } from "./secret-encryption.ts";

describe("stored credential encryption", () => {
  test("derives a credential key from the existing authentication secret", () => {
    expect(resolveCredentialEncryptionKey("  instance-password  ")).toBe("instance-password");
    expect(resolveCredentialEncryptionKeys({ EDGE_EVER_AUTH_PASSWORD: "instance-password" })[0])
      .toBe("edgeever:ai-credentials:v1:instance-password");
  });

  test("decrypts credentials saved with the legacy object-storage key", async () => {
    const encrypted = await encryptSecret("provider-key", "legacy-storage-key");
    await expect(decryptStoredCredential(encrypted, {
      EDGE_EVER_AUTH_PASSWORD: "current-auth-secret",
      EDGE_EVER_STORAGE_ENCRYPTION_KEY: "legacy-storage-key",
    })).resolves.toBe("provider-key");
  });

  test("never uses the legacy object-storage key for new credentials", () => {
    expect(resolvePrimaryCredentialEncryptionKey({
      EDGE_EVER_STORAGE_ENCRYPTION_KEY: "legacy-storage-key",
    })).toBeUndefined();
  });

  test("decrypts credentials with persisted fallback secrets after rotation", async () => {
    const passwordEncrypted = await encryptSecret(
      "provider-key",
      resolvePrimaryCredentialEncryptionKey({ EDGE_EVER_AUTH_PASSWORD: "original-password" }),
    );
    await expect(decryptStoredCredential(passwordEncrypted, {
      EDGE_EVER_AUTH_PASSWORD: "rotated-password",
      EDGE_EVER_AUTH_PASSWORD_FALLBACK: "original-password",
    })).resolves.toBe("provider-key");

    const credentialsEncrypted = await encryptSecret(
      "provider-key",
      resolvePrimaryCredentialEncryptionKey({
        EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY: "original-credentials-key",
      }),
    );
    await expect(decryptStoredCredential(credentialsEncrypted, {
      EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY: "rotated-credentials-key",
      EDGE_EVER_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS: "original-credentials-key",
    })).resolves.toBe("provider-key");
  });

  test("keeps the original key derivation so saved speech keys stay readable", () => {
    expect(resolvePrimaryCredentialEncryptionKey({ EDGE_EVER_AUTH_PASSWORD: "instance-password" }))
      .toBe("edgeever:ai-credentials:v1:instance-password");
  });

  test("reports an undecryptable credential with the existing error code", async () => {
    await expect(decryptStoredCredential("corrupted", { EDGE_EVER_AUTH_PASSWORD: "instance-password" }))
      .rejects.toMatchObject({ code: "ai_credentials_unavailable", status: 503 });
  });
});
