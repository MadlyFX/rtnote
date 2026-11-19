import type { Context } from "hono";
import type { CloudflareStorageBindings } from "./cloudflare-storage-adapter";
import type { StorageAdapter } from "./storage-contract";

export type Bindings = {
  /** Runtime driver for public-only egress; no platform-specific business logic. */
  publicNetworkFetch?: (input: string, init: RequestInit) => Promise<Response>;
  /** The only persistence dependency exposed to application code. */
  storage: StorageAdapter;
  RTNOTE_AUTH_USERNAME?: string;
  RTNOTE_RUNTIME?: string;
  RTNOTE_CONTAINER_IMAGE?: string;
  RTNOTE_DEPLOYMENT_TRIGGER?: string;
  RTNOTE_DEPLOYMENT_METHOD?: string;
  RTNOTE_BUILD_CREATED_AT?: string;
  RTNOTE_BUILD_TRIGGER?: string;
  RTNOTE_BUILD_METHOD?: string;
  /** Creation time of the active deployment version, supplied by a runtime adapter. */
  deploymentVersionCreatedAt?: string;
  RTNOTE_AUTH_PASSWORD?: string;
  RTNOTE_AUTH_PASSWORD_HASH?: string;
  RTNOTE_AUTH_PASSWORD_FALLBACK?: string;
  RTNOTE_SESSION_TTL_DAYS?: string;
  RTNOTE_AUTH_LOGIN_WINDOW_SECONDS?: string;
  RTNOTE_AUTH_LOGIN_USERNAME_MAX_ATTEMPTS?: string;
  RTNOTE_AUTH_LOGIN_USERNAME_COOLDOWN_SECONDS?: string;
  RTNOTE_AUTH_LOGIN_IP_MAX_ATTEMPTS?: string;
  RTNOTE_AUTH_LOGIN_IP_COOLDOWN_SECONDS?: string;
  RTNOTE_R2_BUCKET_NAME?: string;
  /** Legacy decryption fallback; new credentials use auth-derived keys. */
  RTNOTE_STORAGE_ENCRYPTION_KEY?: string;
  RTNOTE_CREDENTIALS_ENCRYPTION_KEY?: string;
  RTNOTE_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS?: string;
  RTNOTE_DEMO_MODE?: string;
  RTNOTE_LOCAL_DEMO_SEED?: string;
  RTNOTE_ALLOW_UNAUTHENTICATED?: string;
  /** HTTPS URL of the signed community registry. Unset disables the catalog. */
  RTNOTE_COMMUNITY_REGISTRY_URL?: string;
};

export type WorkerBindings = Omit<Bindings, "storage" | "publicNetworkFetch" | "deploymentVersionCreatedAt"> & CloudflareStorageBindings & {
  ASSETS: Fetcher;
  CF_VERSION_METADATA?: { timestamp?: string };
};

export type AuthContext = {
  kind: "user" | "agent";
  actorType: "user" | "agent";
  actorId: string | null;
  username: string;
  displayName: string | null;
  scopes: string[];
  workspaceId: string;
  role: "owner" | "member";
  sessionId?: string;
  tokenId?: string;
  /** Recovery-code session that must rebind TOTP before any other access. */
  mfaRestricted?: boolean;
};

export type AuditActor = {
  actorType: "user" | "agent";
  actorId: string | null;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    auth: AuthContext;
  };
};

export type AppContext = Context<AppEnv>;
