import { Database } from "bun:sqlite";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasBootstrapCredential } from "../apps/api/src/auth-bootstrap.ts";
import { isUnauthenticatedAccessEnabled } from "../apps/api/src/auth-state.ts";
import { isRTNoteAppPath } from "../apps/api/src/app-paths.ts";
import { fetchRTNoteApp } from "../apps/api/src/index.ts";
import { isNotebookSitePagePath, renderNotebookSitePage } from "../apps/api/src/notebook-site-page.ts";
import { isPublicMemoSharePagePath, renderPublicMemoSharePage } from "../apps/api/src/share-page.ts";
import { isPublicFormPagePath, isWebManifestPath, renderPublicFormPage, renderWebManifest } from "../apps/api/src/public-page-branding.ts";
import { isPublicPagePath, PUBLIC_PAGE_HEADERS } from "../packages/shared/src/public-page-headers.ts";
import { nodePublicFetch } from "../apps/api/src/node-public-network.ts";
import { createSelfHostedStorageAdapter } from "../apps/api/src/self-hosted-storage-adapter.ts";
import { resolveSelfHostedConfig } from "./self-hosted-config.mjs";
import { ensureSelfHostedCredentialSecrets, loadSelfHostedEnvironment } from "./self-hosted-secrets.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeEnvironment = await loadSelfHostedEnvironment(process.env);
const config = resolveSelfHostedConfig(runtimeEnvironment, projectRoot);
const { dataDirectory, databaseFile, resourcesDirectory, webDirectory } = config;

await mkdir(dataDirectory, { recursive: true });
await mkdir(resourcesDirectory, { recursive: true });
await ensureSelfHostedCredentialSecrets(dataDirectory, runtimeEnvironment);
const sqlite = new Database(databaseFile, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;");

const migrationFiles = (await readdir(join(projectRoot, "migrations")))
  .filter((name) => name.endsWith(".sql"))
  .sort();

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS _rtnote_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

const appliedMigrations = new Set(
  sqlite.query("SELECT name FROM _rtnote_migrations").all().map((row) => row.name),
);

for (const name of migrationFiles) {
  if (appliedMigrations.has(name)) {
    continue;
  }

  const sql = await readFile(join(projectRoot, "migrations", name), "utf8");
  sqlite.transaction(() => {
    sqlite.exec(sql);
    sqlite.query("INSERT INTO _rtnote_migrations (name, applied_at) VALUES (?, ?)").run(name, new Date().toISOString());
  })();
  console.log(`[self-hosted] applied migration ${name}`);
}

const existingUser = sqlite.query("SELECT id FROM users WHERE is_disabled = 0 LIMIT 1").get();
if (
  !existingUser
  && !hasBootstrapCredential(runtimeEnvironment.RTNOTE_AUTH_PASSWORD, runtimeEnvironment.RTNOTE_AUTH_PASSWORD_HASH)
  && !isUnauthenticatedAccessEnabled(runtimeEnvironment.RTNOTE_ALLOW_UNAUTHENTICATED)
) {
  sqlite.close();
  throw new Error(
    "Authentication is not configured. Set RTNOTE_AUTH_PASSWORD (recommended), "
    + "RTNOTE_AUTH_PASSWORD_HASH, or explicitly set RTNOTE_ALLOW_UNAUTHENTICATED=true.",
  );
}

await ensureSelfHostedCredentialSecrets(dataDirectory, runtimeEnvironment, { generateIfMissing: true });

const storage = config.storageBackend === "s3"
  ? (
      await import("../apps/api/src/s3-compatible-storage-adapter.ts")
    ).createS3CompatibleStorageAdapter(sqlite, {
        bucket: runtimeEnvironment.RTNOTE_S3_BUCKET ?? "",
        region: runtimeEnvironment.RTNOTE_S3_REGION,
        endpoint: runtimeEnvironment.RTNOTE_S3_ENDPOINT,
        accessKeyId: runtimeEnvironment.RTNOTE_S3_ACCESS_KEY_ID,
        secretAccessKey: runtimeEnvironment.RTNOTE_S3_SECRET_ACCESS_KEY,
        forcePathStyle: runtimeEnvironment.RTNOTE_S3_FORCE_PATH_STYLE
          ? runtimeEnvironment.RTNOTE_S3_FORCE_PATH_STYLE === "true"
          : undefined,
      })
  : createSelfHostedStorageAdapter(sqlite, resourcesDirectory);
const env = {
  storage,
  publicNetworkFetch: nodePublicFetch,
  RTNOTE_AUTH_USERNAME: runtimeEnvironment.RTNOTE_AUTH_USERNAME ?? "admin",
  RTNOTE_RUNTIME: "self-hosted-bun",
  RTNOTE_CONTAINER_IMAGE: runtimeEnvironment.RTNOTE_CONTAINER_IMAGE,
  RTNOTE_DEPLOYMENT_TRIGGER: runtimeEnvironment.RTNOTE_DEPLOYMENT_TRIGGER,
  RTNOTE_DEPLOYMENT_METHOD: runtimeEnvironment.RTNOTE_DEPLOYMENT_METHOD,
  RTNOTE_BUILD_CREATED_AT: runtimeEnvironment.RTNOTE_BUILD_CREATED_AT,
  RTNOTE_BUILD_TRIGGER: runtimeEnvironment.RTNOTE_BUILD_TRIGGER,
  RTNOTE_BUILD_METHOD: runtimeEnvironment.RTNOTE_BUILD_METHOD,
  RTNOTE_AUTH_PASSWORD: runtimeEnvironment.RTNOTE_AUTH_PASSWORD,
  RTNOTE_AUTH_PASSWORD_HASH: runtimeEnvironment.RTNOTE_AUTH_PASSWORD_HASH,
  RTNOTE_AUTH_PASSWORD_FALLBACK: runtimeEnvironment.RTNOTE_AUTH_PASSWORD_FALLBACK,
  RTNOTE_SESSION_TTL_DAYS: runtimeEnvironment.RTNOTE_SESSION_TTL_DAYS ?? "400",
  RTNOTE_AUTH_LOGIN_WINDOW_SECONDS: runtimeEnvironment.RTNOTE_AUTH_LOGIN_WINDOW_SECONDS,
  RTNOTE_AUTH_LOGIN_USERNAME_MAX_ATTEMPTS: runtimeEnvironment.RTNOTE_AUTH_LOGIN_USERNAME_MAX_ATTEMPTS,
  RTNOTE_AUTH_LOGIN_USERNAME_COOLDOWN_SECONDS: runtimeEnvironment.RTNOTE_AUTH_LOGIN_USERNAME_COOLDOWN_SECONDS,
  RTNOTE_AUTH_LOGIN_IP_MAX_ATTEMPTS: runtimeEnvironment.RTNOTE_AUTH_LOGIN_IP_MAX_ATTEMPTS,
  RTNOTE_AUTH_LOGIN_IP_COOLDOWN_SECONDS: runtimeEnvironment.RTNOTE_AUTH_LOGIN_IP_COOLDOWN_SECONDS,
  // Legacy decryption fallback for credentials saved by older releases.
  RTNOTE_STORAGE_ENCRYPTION_KEY: runtimeEnvironment.RTNOTE_STORAGE_ENCRYPTION_KEY,
  RTNOTE_CREDENTIALS_ENCRYPTION_KEY: runtimeEnvironment.RTNOTE_CREDENTIALS_ENCRYPTION_KEY,
  RTNOTE_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS: runtimeEnvironment.RTNOTE_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS,
  RTNOTE_DEMO_MODE: runtimeEnvironment.RTNOTE_DEMO_MODE,
  RTNOTE_ALLOW_UNAUTHENTICATED: runtimeEnvironment.RTNOTE_ALLOW_UNAUTHENTICATED,
  RTNOTE_COMMUNITY_REGISTRY_URL: runtimeEnvironment.RTNOTE_COMMUNITY_REGISTRY_URL,
};

const executionContext = {
  waitUntil: (promise) => Promise.resolve(promise).catch((error) => console.error("[self-hosted] background task failed", error)),
  passThroughOnException: () => undefined,
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const serveStatic = async (request) => {
  const url = new URL(request.url);
  const requestedPath = normalize(url.pathname === "/" ? "/index.html" : url.pathname);
  const candidate = resolve(webDirectory, `.${requestedPath}`);
  const relativeCandidate = relative(webDirectory, candidate);

  if (relativeCandidate.startsWith("..") || relativeCandidate.includes(".." + "/")) {
    return new Response("Not Found", { status: 404 });
  }

  const file = Bun.file(candidate);
  if (await file.exists()) {
    return new Response(file, {
      headers: { "Content-Type": contentTypes[extname(candidate)] ?? "application/octet-stream" },
    });
  }

  const index = Bun.file(join(webDirectory, "index.html"));
  return (await index.exists())
    ? new Response(index, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Share and form links render the app shell; keep them out of search indexes and caches.
          ...(isPublicPagePath(url.pathname) ? PUBLIC_PAGE_HEADERS : {}),
        },
      })
    : new Response("Web build not found. Run bun run build:web first.", { status: 503 });
};

const server = Bun.serve({
  hostname: config.hostname,
  port: config.port,
  // Model providers may take longer than Bun's 10-second default to emit the
  // first streaming token. Keep the connection alive within Bun's supported range.
  idleTimeout: config.idleTimeout,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const loadAppShell = () => serveStatic(new Request(new URL("/index.html", request.url)));
    if (isNotebookSitePagePath(pathname)) {
      return renderNotebookSitePage(request, storage.db, loadAppShell);
    }
    if (isPublicMemoSharePagePath(pathname)) {
      const page = await renderPublicMemoSharePage(request, storage.db, loadAppShell);
      if (page) return page;
    }
    if (isWebManifestPath(pathname)) {
      const page = await renderWebManifest(request, storage.db, () => serveStatic(new Request(new URL("/manifest.webmanifest", request.url))));
      if (page) return page;
    }
    if (isPublicFormPagePath(pathname)) {
      const page = await renderPublicFormPage(request, storage.db, loadAppShell);
      if (page) return page;
    }
    if (isRTNoteAppPath(pathname)) {
      return fetchRTNoteApp(request, env, executionContext);
    }
    return serveStatic(request);
  },
});

console.log(`[self-hosted] listening on ${server.url}`);
console.log(`[self-hosted] data directory: ${dataDirectory}`);
console.log(`[self-hosted] storage backend: ${config.storageBackend}`);
console.log(`[self-hosted] idle timeout: ${config.idleTimeout}s`);

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[self-hosted] received ${signal}; shutting down`);

  try {
    await server.stop();
    sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    sqlite.close();
    console.log("[self-hosted] shutdown complete");
  } catch (error) {
    console.error("[self-hosted] shutdown failed", error);
    process.exitCode = 1;
  }
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
