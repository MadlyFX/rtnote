import { join, resolve } from "node:path";

const SUPPORTED_STORAGE_BACKENDS = new Set(["local", "s3"]);

const parseInteger = (value, fallback, name, minimum, maximum) => {
  const normalized = value?.trim();
  if (!normalized) return fallback;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
};

export const resolveSelfHostedConfig = (environment = process.env, projectRoot = process.cwd()) => {
  const dataDirectory = resolve(environment.RTNOTE_DATA_DIR ?? join(projectRoot, ".rtnote-data"));
  const storageBackend = (environment.RTNOTE_STORAGE_BACKEND ?? "local").trim().toLowerCase();

  if (!SUPPORTED_STORAGE_BACKENDS.has(storageBackend)) {
    throw new Error("RTNOTE_STORAGE_BACKEND must be either local or s3");
  }
  if (storageBackend === "s3" && !environment.RTNOTE_S3_BUCKET?.trim()) {
    throw new Error("RTNOTE_S3_BUCKET is required when RTNOTE_STORAGE_BACKEND=s3");
  }

  return {
    dataDirectory,
    databaseFile: resolve(environment.RTNOTE_SQLITE_FILE ?? join(dataDirectory, "rtnote.sqlite")),
    resourcesDirectory: resolve(environment.RTNOTE_RESOURCES_DIR ?? join(dataDirectory, "resources")),
    webDirectory: resolve(environment.RTNOTE_WEB_DIR ?? join(projectRoot, "apps/web/dist")),
    hostname: environment.RTNOTE_HOST?.trim() || "0.0.0.0",
    port: parseInteger(environment.PORT ?? environment.RTNOTE_PORT, 8787, "RTNOTE_PORT", 1, 65_535),
    idleTimeout: parseInteger(
      environment.RTNOTE_IDLE_TIMEOUT_SECONDS,
      120,
      "RTNOTE_IDLE_TIMEOUT_SECONDS",
      10,
      255,
    ),
    storageBackend,
  };
};
