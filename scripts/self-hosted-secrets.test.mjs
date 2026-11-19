import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  ensureSelfHostedCredentialSecrets,
  hasSelfHostedCredentialSeed,
  resolveSelfHostedSecretsPath,
  SELF_HOSTED_SECRETS_FILE_NAME,
} from "./self-hosted-secrets.mjs";
import {
  decryptStoredCredential,
  resolvePrimaryCredentialEncryptionKey,
} from "../apps/api/src/credential-encryption.ts";
import { encryptSecret } from "../apps/api/src/secret-encryption.ts";

const makeDataDirectory = async () => mkdtemp(`${tmpdir()}/rtnote-secrets-`);

describe("self-hosted credential secret persistence", () => {
  test("names the secrets file beside SQLite, not inside it", () => {
    expect(SELF_HOSTED_SECRETS_FILE_NAME).toBe("rtnote-secrets.json");
    expect(resolveSelfHostedSecretsPath("/data")).toBe("/data/rtnote-secrets.json");
    expect(resolveSelfHostedSecretsPath("/data")).not.toContain("sqlite");
  });

  test("persists the authentication secret and restores it after env vars disappear", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      const first = await ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_AUTH_PASSWORD: "instance-password",
      });
      const originalKey = resolvePrimaryCredentialEncryptionKey(first);
      expect(originalKey).toBe("rtnote:ai-credentials:v1:instance-password");
      expect(hasSelfHostedCredentialSeed(first)).toBe(true);

      const stored = JSON.parse(await readFile(resolveSelfHostedSecretsPath(dataDirectory), "utf8"));
      expect(stored).toEqual({
        version: 1,
        authPassword: "instance-password",
      });
      if (process.platform !== "win32") {
        expect((await stat(resolveSelfHostedSecretsPath(dataDirectory))).mode & 0o777).toBe(0o600);
      }

      const restored = await ensureSelfHostedCredentialSecrets(dataDirectory, {});
      expect(restored.RTNOTE_AUTH_PASSWORD).toBe("instance-password");
      expect(resolvePrimaryCredentialEncryptionKey(restored)).toBe(originalKey);

      const encrypted = await encryptSecret("provider-key", originalKey);
      await expect(decryptStoredCredential(encrypted, restored)).resolves.toBe("provider-key");
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("does not write a secrets file before the instance can start", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      const environment = await ensureSelfHostedCredentialSecrets(dataDirectory, {});
      expect(hasSelfHostedCredentialSeed(environment)).toBe(false);
      await expect(readFile(resolveSelfHostedSecretsPath(dataDirectory), "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("generates a dedicated credentials key when a running instance has no secret", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      const environment = await ensureSelfHostedCredentialSecrets(dataDirectory, {}, { generateIfMissing: true });
      expect(environment.RTNOTE_CREDENTIALS_ENCRYPTION_KEY).toMatch(/^[a-f0-9]{64}$/);
      expect(resolvePrimaryCredentialEncryptionKey(environment)).toBe(
        `rtnote:ai-credentials:v1:${environment.RTNOTE_CREDENTIALS_ENCRYPTION_KEY}`,
      );

      const second = await ensureSelfHostedCredentialSecrets(dataDirectory, {}, { generateIfMissing: true });
      expect(second.RTNOTE_CREDENTIALS_ENCRYPTION_KEY).toBe(environment.RTNOTE_CREDENTIALS_ENCRYPTION_KEY);
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("keeps the original secret for decryption when environment values change", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      await ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_AUTH_PASSWORD: "original-password",
      });
      const rotated = await ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_AUTH_PASSWORD: "rotated-password",
      });
      expect(rotated.RTNOTE_AUTH_PASSWORD).toBe("rotated-password");
      expect(rotated.RTNOTE_AUTH_PASSWORD_FALLBACK).toBe("original-password");

      const encrypted = await encryptSecret(
        "provider-key",
        resolvePrimaryCredentialEncryptionKey({ RTNOTE_AUTH_PASSWORD: "original-password" }),
      );
      await expect(decryptStoredCredential(encrypted, rotated)).resolves.toBe("provider-key");
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("keeps a previous credentials key in the decrypt ring after rotation", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      await ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_CREDENTIALS_ENCRYPTION_KEY: "original-credentials-key",
      });
      const rotated = await ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_CREDENTIALS_ENCRYPTION_KEY: "rotated-credentials-key",
      });
      expect(rotated.RTNOTE_CREDENTIALS_ENCRYPTION_KEY).toBe("rotated-credentials-key");
      expect(rotated.RTNOTE_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS).toBe("original-credentials-key");

      const encrypted = await encryptSecret(
        "provider-key",
        resolvePrimaryCredentialEncryptionKey({
          RTNOTE_CREDENTIALS_ENCRYPTION_KEY: "original-credentials-key",
        }),
      );
      await expect(decryptStoredCredential(encrypted, rotated)).resolves.toBe("provider-key");
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("refuses to replace a corrupt secrets file with a new key", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      await writeFile(resolveSelfHostedSecretsPath(dataDirectory), "{not-json", "utf8");
      await expect(ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_AUTH_PASSWORD: "instance-password",
      }, { generateIfMissing: true })).rejects.toThrow(/do not generate a replacement key/);
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });

  test("refuses an empty secrets file even if a new environment secret is present", async () => {
    const dataDirectory = await makeDataDirectory();
    try {
      await writeFile(resolveSelfHostedSecretsPath(dataDirectory), `${JSON.stringify({ version: 1 })}\n`, "utf8");
      await expect(ensureSelfHostedCredentialSecrets(dataDirectory, {
        RTNOTE_AUTH_PASSWORD: "instance-password",
      })).rejects.toThrow(/do not generate a replacement key/);
    } finally {
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });
});
