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
    expect(resolveCredentialEncryptionKeys({ RTNOTE_AUTH_PASSWORD: "instance-password" })[0])
      .toBe("rtnote:ai-credentials:v1:instance-password");
  });

  test("decrypts credentials saved with the legacy object-storage key", async () => {
    const encrypted = await encryptSecret("provider-key", "legacy-storage-key");
    await expect(decryptStoredCredential(encrypted, {
      RTNOTE_AUTH_PASSWORD: "current-auth-secret",
      RTNOTE_STORAGE_ENCRYPTION_KEY: "legacy-storage-key",
    })).resolves.toBe("provider-key");
  });

  test("never uses the legacy object-storage key for new credentials", () => {
    expect(resolvePrimaryCredentialEncryptionKey({
      RTNOTE_STORAGE_ENCRYPTION_KEY: "legacy-storage-key",
    })).toBeUndefined();
  });

  test("decrypts credentials with persisted fallback secrets after rotation", async () => {
    const passwordEncrypted = await encryptSecret(
      "provider-key",
      resolvePrimaryCredentialEncryptionKey({ RTNOTE_AUTH_PASSWORD: "original-password" }),
    );
    await expect(decryptStoredCredential(passwordEncrypted, {
      RTNOTE_AUTH_PASSWORD: "rotated-password",
      RTNOTE_AUTH_PASSWORD_FALLBACK: "original-password",
    })).resolves.toBe("provider-key");

    const credentialsEncrypted = await encryptSecret(
      "provider-key",
      resolvePrimaryCredentialEncryptionKey({
        RTNOTE_CREDENTIALS_ENCRYPTION_KEY: "original-credentials-key",
      }),
    );
    await expect(decryptStoredCredential(credentialsEncrypted, {
      RTNOTE_CREDENTIALS_ENCRYPTION_KEY: "rotated-credentials-key",
      RTNOTE_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS: "original-credentials-key",
    })).resolves.toBe("provider-key");
  });

  test("keeps the original key derivation so saved speech keys stay readable", () => {
    expect(resolvePrimaryCredentialEncryptionKey({ RTNOTE_AUTH_PASSWORD: "instance-password" }))
      .toBe("rtnote:ai-credentials:v1:instance-password");
  });

  test("reports an undecryptable credential with the existing error code", async () => {
    await expect(decryptStoredCredential("corrupted", { RTNOTE_AUTH_PASSWORD: "instance-password" }))
      .rejects.toMatchObject({ code: "ai_credentials_unavailable", status: 503 });
  });
});
