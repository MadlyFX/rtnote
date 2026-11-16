import type { ImportMemosInput, ImportMemosResponse } from "@edgeever/shared/note-import/types";
import type { NotebookUpdateInput } from "@edgeever/shared";

import { createPluginCapabilities } from './plugin-capabilities';
import type {
  ApiToken,
  AuthSession,
  LoginInput,
  LoginMfaInput,
  MfaChallenge,
  TotpBatchConfirmInput,
  TotpConfirmResponse,
  TotpReauthInput,
  TotpRecoveryCodesResponse,
  TotpSetupResponse,
  TotpSetupVerifyInput,
  TotpStatus,
  LoginDeviceSession,
  InstanceUser,
  CreatedApiToken,
  JsonBackupMemo,
  JsonBackupNotebook,
  JsonBackupRevision,
  MemoDetail,
  MemoEditSession,
  MemoRevision,
  MemoSummary,
  MemoShare,
  NotebookShare,
  PublicNotebookShare,
  NotebookSiteUpdate,
  NotebookSiteSearchResult,
  NotebookSiteExclusions,
  NotebookSiteContents,
  MemoNotebookSite,
  NotebookSiteMemoPreview,
  ManagedMemoShare,
  PublicTableForm,
  TableFormSettings,
  TableFormUpdateInput,
  MemoTemplate,
  ScheduledTask,
  ScheduledTaskRun,
  WorkspaceExtension,
  WorkspaceExtensionUpsertInput,
  Notebook,
  Resource,
  ResourceListItem,
  ResourceStorageSummary,
  ObjectStorageSettings,
  AccountNoteProse,
  NoteProsePatch,
  PublicMemoShare,
  TagSummary,
  TiptapDoc,
  TranscriptionSettings,
  TranscriptionStandard,
  SyncBootstrapResponse,
  SyncChange,
  SyncChangesResponse,
  DeploymentMetadata,
  PluginPublicFetchRequest,
  PluginPublicFetchResponse,
} from "@edgeever/shared";

export const MAX_SINGLE_REQUEST_UPLOAD_BYTES = 5 * 1024 * 1024;

export type EdgeEverClientRequestContext = {
  path: string;
  token?: string;
};

export type EdgeEverClientOptions = {
  baseUrl?: string | (() => string);
  token?: string | null | (() => string | null | undefined);
  fetch?: typeof fetch;
  /** Web only: retry initial network/CORS failures to the speech service through the instance. */
  allowSpeechServerFallback?: boolean;
  /** Used only for the speech service request; defaults to `fetch`. */
  providerFetch?: typeof fetch;
  beforeRequest?: (context: EdgeEverClientRequestContext) => void | Promise<void>;
  shouldAttachToken?: (path: string) => boolean;
  onUnauthorized?: (context: EdgeEverClientRequestContext) => void | Promise<void>;
};

export type MultipartResourceUploadSource = {
  filename: string;
  mimeType: string;
  byteSize: number;
  readPart: (start: number, end: number) => Promise<Blob | Uint8Array<ArrayBuffer>>;
  /** Importers use this to distinguish an uncertain commit from a failed part. */
  onBeforeComplete?: () => void | Promise<void>;
  onPartUploaded?: (byteSize: number) => void;
};

export type InstanceHealth = {
  ok: true;
  name: string;
  runtime?: string | null;
  containerImageSource?: "official-ghcr" | "official-cn-mirror" | "custom" | "unknown" | string | null;
  authMode?: string | null;
  build?: string | null;
  deployment?: DeploymentMetadata | null;
  deploymentVersionCreatedAt?: string | null;
  /** Self-hosted images only: when the container image was built. */
  buildCreatedAt?: string | null;
  /** Self-hosted images only: how the container image was built, not how it was deployed. */
  buildProvenance?: DeploymentMetadata | null;
  migration?: string | null;
  storage?: {
    database?: "d1" | "sqlite" | string | null;
    resources?: "r2" | "filesystem" | "s3" | string | null;
  } | null;
  objectStorageProvider?: "builtin" | "s3" | "unknown" | string | null;
  /** Clients older than this open notes read-only. Absent on older servers. */
  minClientVersion?: string | null;
};

export type InstanceRelease = {
  version: string;
  changes: Record<string, readonly string[]>;
};

export type MemoFilterMode = "all" | "tagged" | "untagged" | "pinned";
export type MemoSortMode = "updated-desc" | "created-desc" | "title-asc" | "title-desc";

export type ListNotebooksResponse = {
  notebooks: Notebook[];
};

export type ListMemosResponse = {
  memos: MemoSummary[];
  totalCount?: number;
  nextCursor: string | null;
};

export type ListMemoRevisionsResponse = {
  revisions: MemoRevision[];
};

export type ListResourcesResponse = {
  resources: ResourceListItem[];
  summary: ResourceStorageSummary;
};

export type ListTagsResponse = {
  tags: TagSummary[];
};

export type ListApiTokensResponse = {
  apiTokens: ApiToken[];
  availableScopes: string[];
};

export type InstanceStorageUsageResponse = {
  summary: ResourceStorageSummary;
  users: { userId: string; summary: ResourceStorageSummary }[];
};

export type ListUsersResponse = {
  users: InstanceUser[];
};

export type UserResponse = {
  user: InstanceUser;
};

export type ListLoginDeviceSessionsResponse = {
  sessions: LoginDeviceSession[];
};

export type ObjectStorageSettingsResponse = {
  settings: ObjectStorageSettings;
  externalSettings?: ObjectStorageSettings | null;
};

export type MemoResponse = {
  memo: MemoDetail;
};

export type ListTemplatesResponse = {
  templates: MemoTemplate[];
};

export type TemplateResponse = {
  template: MemoTemplate;
};

export type ListScheduledTasksResponse = {
  tasks: ScheduledTask[];
};

export type ListWorkspaceExtensionsResponse = {
  extensions: WorkspaceExtension[];
};

export type WorkspaceExtensionResponse = {
  extension: WorkspaceExtension;
};

export type ScheduledTaskResponse = {
  task: ScheduledTask;
};

export type ScheduledTaskRunResponse = {
  run: ScheduledTaskRun;
};

export type ScheduledTaskRunsResponse = {
  runs: ScheduledTaskRun[];
  totalCount: number;
  nextOffset: number | null;
};

export type ScheduledTaskRunHistoryItem = ScheduledTaskRun & {
  taskName: string;
  pluginId: string;
  ownerPluginId: string | null;
  pluginScheduleKey: string | null;
};

export type ScheduledTaskRunHistoryResponse = {
  runs: ScheduledTaskRunHistoryItem[];
  totalCount: number;
  nextOffset: number | null;
};

export type MemoShareResponse = {
  share: MemoShare | null;
};

export type ListMemoSharesResponse = {
  shares: ManagedMemoShare[];
  nextOffset: number | null;
};

export type PublicMemoShareResponse = {
  share: PublicMemoShare;
};

export type NotebookResponse = {
  notebook: Notebook;
};

export type ResourceResponse = {
  resource: Resource;
};

export type ResourceUploadResponse = {
  upload: {
    id: string;
    resourceId: string;
    partSize: number;
    partCount: number;
    byteSize: number;
    expiresAt: string;
  };
};

export type MarkdownExportPage = {
  memos: MemoDetail[];
  resources: Resource[];
  totalCount?: number;
  nextOffset: number | null;
  nextCursor?: string | null;
};

export type JsonBackupPage = MarkdownExportPage & {
  revisions: JsonBackupRevision[];
};


export type TranscriptionProviderCreatePayload = {
  provider: TranscriptionStandard;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  initialModelId?: string;
};

export type TranscriptionProviderUpdatePayload = {
  provider: TranscriptionStandard;
  displayName: string;
  baseUrl: string;
  apiKey?: string;
  isEnabled: boolean;
};

/** @deprecated Use SyncBootstrapResponse; kept for mobile source compatibility. */
export type MobileSyncBootstrapPage = SyncBootstrapResponse;

/** @deprecated Use SyncChange; kept for mobile source compatibility. */
export type MobileSyncChange = SyncChange;

/** @deprecated Use SyncChangesResponse; kept for mobile source compatibility. */
export type MobileSyncChangesPage = SyncChangesResponse;

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  responseDiagnostics?: ApiResponseDiagnostics;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    responseDiagnostics?: ApiResponseDiagnostics,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.responseDiagnostics = responseDiagnostics;
  }
}

/** The second-step challenge carried by a 401 `mfa_required` login error. */
export const getMfaChallenge = (error: unknown): MfaChallenge | null => {
  if (!(error instanceof ApiRequestError) || error.status !== 401 || error.code !== "mfa_required") return null;
  const details = error.details as Partial<MfaChallenge> | undefined;
  if (!details || typeof details.challengeToken !== "string" || !details.challengeToken) return null;
  return {
    challengeToken: details.challengeToken,
    expiresAt: typeof details.expiresAt === "string" ? details.expiresAt : "",
    methods: Array.isArray(details.methods) ? details.methods : ["totp", "recovery_code"],
  };
};

/** A recovery-code session hit a business route before rebinding TOTP. */
export const isMfaRebindRequiredError = (error: unknown) =>
  error instanceof ApiRequestError && error.status === 403 && error.code === "mfa_rebind_required";

export type ApiResponseDiagnostics = {
  cloudflareMitigated: boolean;
  isEdgeEverApiError: boolean;
  rayId?: string;
};

export type { SyncBootstrapResponse, SyncChangesResponse };

export const createEdgeEverClient = (options: EdgeEverClientOptions = {}) => {
  const getFetch = () => options.fetch ?? globalThis.fetch;
  const providerFetch = (): typeof fetch => async (url, init) => {
    const directFetch = options.providerFetch ?? getFetch();
    if (!options.allowSpeechServerFallback) return directFetch(url, { ...init, credentials: "omit", redirect: "error" });
    const { fetchWithServerFallback } = await import("./speech-provider-relay");
    return fetchWithServerFallback(url, init, directFetch, async target => {
      const { response } = await send("/api/v1/ai/provider-relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-edgeever-ai-target": target.url,
          "x-edgeever-ai-method": target.method,
          "x-edgeever-ai-headers": JSON.stringify(Object.fromEntries(target.headers)),
        },
        body: target.method === "GET" ? undefined : await target.arrayBuffer(),
        signal: target.signal,
      });
      return response;
    });
  };
  const getBaseUrl = () => normalizeBaseUrl(
    typeof options.baseUrl === "function" ? options.baseUrl() : options.baseUrl,
  );
  const getToken = () => {
    const token = typeof options.token === "function" ? options.token() : options.token;
    return token || undefined;
  };

  const send = async (
    path: string,
    init?: RequestInit,
    requestOptions?: { attachToken?: boolean; setJsonContentType?: boolean },
  ) => {
    const token = getToken();
    const context: EdgeEverClientRequestContext = { path, ...(token ? { token } : {}) };
    await options.beforeRequest?.(context);

    const headers = new Headers(init?.headers);
    const attachToken = requestOptions?.attachToken
      ?? options.shouldAttachToken?.(path)
      ?? true;

    if (token && attachToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (
      requestOptions?.setJsonContentType !== false
      && !(init?.body instanceof FormData)
      && !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    const requestUrl = isAbsoluteHttpUrl(path) ? path : `${getBaseUrl()}${path}`;
    const response = await getFetch()(requestUrl, {
      credentials: "include",
      ...init,
      headers,
    });

    return { context, response };
  };

  const throwRequestError = async (
    context: EdgeEverClientRequestContext,
    response: Response,
    fallbackMessage = "Request failed",
  ): Promise<never> => {
    const body = await response.json().catch(() => null);
    const rayId = response.headers.get("cf-ray")?.trim();
    const error =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { code?: string; message?: string; details?: unknown } }).error
        : undefined;
    const responseDiagnostics: ApiResponseDiagnostics = {
      cloudflareMitigated: response.headers.get("cf-mitigated") === "challenge",
      isEdgeEverApiError: Boolean(error && typeof error === "object"),
      ...(rayId ? { rayId } : {}),
    };

    if (response.status === 401) {
      void options.onUnauthorized?.(context);
    }

    throw new ApiRequestError(
      error?.message || response.statusText || fallbackMessage,
      response.status,
      error?.code,
      error?.details,
      responseDiagnostics,
    );
  };

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const { context, response } = await send(path, init);

    if (!response.ok) {
      await throwRequestError(context, response);
    }

    return response.json() as Promise<T>;
  };

  const requestPluginPublic = async (input: PluginPublicFetchRequest, signal?: AbortSignal): Promise<PluginPublicFetchResponse> => {
    const { context, response } = await send("/api/v1/plugins/network/fetch", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    });
    const upstreamStatus = response.headers.get("x-edgeever-upstream-status");
    if (!response.ok || !upstreamStatus) await throwRequestError(context, response, "Public network request failed");
    const status = Number(upstreamStatus);
    if (!Number.isInteger(status) || status < 100 || status > 599) throw new Error("Invalid public network response status");
    const headers: Record<string, string> = {};
    for (const [key, value] of response.headers) {
      const prefix = "x-edgeever-upstream-header-";
      if (key.startsWith(prefix)) headers[key.slice(prefix.length)] = value;
    }
    return {
      url: input.url,
      status,
      statusText: decodeURIComponent(response.headers.get("x-edgeever-upstream-status-text") ?? ""),
      headers,
      body: await response.arrayBuffer(),
    };
  };

  const requestResourceResponse = async (path: string, init?: RequestInit) => {
    const isAbsolute = isAbsoluteHttpUrl(path);
    const { context, response } = await send(path, init, {
      attachToken: !isAbsolute,
      setJsonContentType: false,
    });
    if (!response.ok) await throwRequestError(context, response, "Resource download failed");
    return response;
  };

  const requestBlob = async (path: string) => (await requestResourceResponse(path)).blob();

  const requestArrayBuffer = async (path: string) => {
    const { context, response } = await send(path, undefined, { setJsonContentType: false });
    if (!response.ok) await throwRequestError(context, response, "Binary download failed");
    return response.arrayBuffer();
  };

  const uploadMemoResourceParts = async (memoId: string, source: MultipartResourceUploadSource) => {
    const filename = source.filename.trim() || "attachment";
    const mimeType = source.mimeType || "application/octet-stream";
    const { upload } = await request<ResourceUploadResponse>(
      `/api/v1/memos/${encodeURIComponent(memoId)}/resource-uploads`,
      {
        method: "POST",
        body: JSON.stringify({ filename, mimeType, byteSize: source.byteSize }),
      },
    );

    try {
      for (let partNumber = 1; partNumber <= upload.partCount; partNumber += 1) {
        const start = (partNumber - 1) * upload.partSize;
        const chunk = await source.readPart(start, Math.min(start + upload.partSize, source.byteSize));
        let attempt = 0;
        while (true) {
          try {
            await request<{ part: { partNumber: number; byteSize: number } }>(
              `/api/v1/resource-uploads/${encodeURIComponent(upload.id)}/parts/${partNumber}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: chunk,
              },
            );
            source.onPartUploaded?.(Math.min(partNumber * upload.partSize, source.byteSize));
            break;
          } catch (error) {
            attempt += 1;
            const retryable = !(error instanceof ApiRequestError)
              || error.status === 408
              || error.status === 429
              || error.status >= 500;
            if (!retryable || attempt >= 3) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt * 250));
          }
        }
      }
      await source.onBeforeComplete?.();
      return await request<ResourceResponse>(
        `/api/v1/resource-uploads/${encodeURIComponent(upload.id)}/complete`,
        { method: "POST", body: JSON.stringify({}) },
      );
    } catch (error) {
      await request<{ ok: true }>(`/api/v1/resource-uploads/${encodeURIComponent(upload.id)}`, {
        method: "DELETE",
      }).catch(() => undefined);
      throw error;
    }
  };

  const uploadMemoResourceMultipart = (memoId: string, file: Blob) =>
    uploadMemoResourceParts(memoId, {
      filename: "name" in file && typeof file.name === "string" && file.name.trim()
        ? file.name
        : "attachment",
      mimeType: file.type || "application/octet-stream",
      byteSize: file.size,
      readPart: async (start, end) => file.slice(start, end),
    });

  const createResourceMultipartSink = (upload: ResourceUploadResponse["upload"]) => {
    let partNumber = 1;
    let bufferedBytes = 0;
    let receivedBytes = 0;
    let chunks: ArrayBuffer[] = [];
    let closed = false;

    const abort = async () => {
      if (closed) return;
      closed = true;
      chunks = [];
      bufferedBytes = 0;
      await request<{ ok: true }>(`/api/v1/resource-uploads/${encodeURIComponent(upload.id)}`, {
        method: "DELETE",
      }).catch(() => undefined);
    };

    const sendPart = async () => {
      if (bufferedBytes === 0) return;
      const body = new Blob(chunks, { type: "application/octet-stream" });
      const currentPart = partNumber;
      chunks = [];
      bufferedBytes = 0;
      let attempt = 0;
      while (true) {
        try {
          await request<{ part: { partNumber: number; byteSize: number } }>(
            `/api/v1/resource-uploads/${encodeURIComponent(upload.id)}/parts/${currentPart}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body,
            },
          );
          partNumber += 1;
          return;
        } catch (error) {
          attempt += 1;
          const retryable = !(error instanceof ApiRequestError)
            || error.status === 408
            || error.status === 429
            || error.status >= 500;
          if (!retryable || attempt >= 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, attempt * 250));
        }
      }
    };

    return {
      write: async (chunk: Uint8Array) => {
        if (closed) throw new Error("Resource restore upload is closed");
        let offset = 0;
        while (offset < chunk.byteLength) {
          const available = upload.partSize - bufferedBytes;
          const length = Math.min(available, chunk.byteLength - offset);
          const copy = new Uint8Array(length);
          copy.set(chunk.subarray(offset, offset + length));
          chunks.push(copy.buffer);
          bufferedBytes += length;
          receivedBytes += length;
          offset += length;
          if (bufferedBytes === upload.partSize) await sendPart();
        }
      },
      close: async () => {
        if (closed) throw new Error("Resource restore upload is closed");
        if (receivedBytes !== upload.byteSize) {
          await abort();
          throw new Error(`Resource restore size mismatch: expected ${upload.byteSize}, received ${receivedBytes}`);
        }
        try {
          await sendPart();
          const result = await request<ResourceResponse>(
            `/api/v1/resource-uploads/${encodeURIComponent(upload.id)}/complete`,
            { method: "POST", body: JSON.stringify({}) },
          );
          closed = true;
          return result;
        } catch (error) {
          await abort();
          throw error;
        }
      },
      abort,
    };
  };

  const createJsonResourceRestoreSink = async (
    resourceId: string,
    metadata: JsonBackupMemo["resources"][number],
  ) => {
    const { upload } = await request<ResourceUploadResponse>(
      `/api/v1/restores/json/resources/${encodeURIComponent(resourceId)}/uploads`,
      { method: "POST", body: JSON.stringify(metadata) },
    );
    return createResourceMultipartSink(upload);
  };


  const pluginCapabilities = createPluginCapabilities(request, requestPluginPublic);

  return {
    fetchSpeechProvider: providerFetch(),
    getInstanceHealth: () => request<InstanceHealth>("/api/health"),
    ...pluginCapabilities,

    getInstanceRelease: () => request<InstanceRelease>("/api/release"),

    getSession: () => request<AuthSession>("/api/v1/auth/session"),

    getPublicNotebookShare: (token: string) =>
      request<{ share: PublicNotebookShare }>(`/api/public/notebook-shares/${encodeURIComponent(token)}`),
    resolveNotebookSite: (slug: string) => request<{ token: string }>(`/api/public/notebook-sites/${encodeURIComponent(slug)}/resolve`),
    searchPublicNotebook: (token: string, input: { q?: string; tag?: string; cursor?: string | null }) => {
      const params = new URLSearchParams();
      if (input.q) params.set("q", input.q);
      if (input.tag) params.set("tag", input.tag);
      if (input.cursor) params.set("cursor", input.cursor);
      return request<NotebookSiteSearchResult>(`/api/public/notebook-shares/${encodeURIComponent(token)}/search?${params}`);
    },
    previewPublicNotebookMemo: (token: string, memoId: string) => request<{ memo: NotebookSiteMemoPreview }>(`/api/public/notebook-shares/${encodeURIComponent(token)}/memos/${encodeURIComponent(memoId)}/preview`),
    updateNotebookSite: (id: string, input: NotebookSiteUpdate) => request<{ share: NotebookShare }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share/site`, { method: "PATCH", body: JSON.stringify(input) }),
    getMemoNotebookSites: (memoId: string) => request<{ sites: MemoNotebookSite[] }>(`/api/v1/memos/${encodeURIComponent(memoId)}/notebook-sites`),
    listNotebookSiteMemos: (id: string, input: { q?: string; visibility?: "all" | "public" | "excluded"; cursor?: string | null; limit?: number }) => {
      const params = new URLSearchParams();
      if (input.q) params.set("q", input.q);
      if (input.visibility) params.set("visibility", input.visibility);
      if (input.cursor) params.set("cursor", input.cursor);
      if (input.limit !== undefined) params.set("limit", String(input.limit));
      return request<NotebookSiteContents>(`/api/v1/notebooks/${encodeURIComponent(id)}/share/memos?${params}`);
    },
    listNotebookSiteExclusions: (id: string, cursor?: string | null) => request<NotebookSiteExclusions>(`/api/v1/notebooks/${encodeURIComponent(id)}/share/excluded-memos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    setNotebookSiteExclusion: (id: string, memoId: string, excluded: boolean) => request<{ memoId: string; excluded: boolean }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share/memos/${encodeURIComponent(memoId)}`, { method: "PATCH", body: JSON.stringify({ excluded }) }),
    getPublicNotebookMemo: (token: string, memoId: string) =>
      request<{ share: PublicMemoShare; memoUrls: Record<string, string> }>(`/api/public/notebook-shares/${encodeURIComponent(token)}/memos/${encodeURIComponent(memoId)}`),
    unlockPublicNotebookShare: (token: string, password: string) =>
      request<{ ok: true }>(`/api/public/notebook-shares/${encodeURIComponent(token)}/unlock`, { method: "POST", body: JSON.stringify({ password }) }),
    updateNotebookShare: (id: string, input: { passwordProtected: boolean }) =>
      request<{ share: NotebookShare }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share`, { method: "PATCH", body: JSON.stringify(input) }),
    listNotebookShares: () => request<{ shares: NotebookShare[] }>("/api/v1/notebook-shares"),
    getNotebookShare: (id: string) => request<{ share: NotebookShare | null }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share`),
    createNotebookShare: (id: string) => request<{ share: NotebookShare }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share`, { method: "POST" }),
    revokeNotebookShare: (id: string) => request<{ ok: true }>(`/api/v1/notebooks/${encodeURIComponent(id)}/share`, { method: "DELETE" }),

    getPublicMemoShare: (token: string) =>
      request<PublicMemoShareResponse>(`/api/public/shares/${encodeURIComponent(token)}`),

    updatePublishedNoteBodyFont: (bodyFont: PublicMemoShare["bodyFont"]) =>
      request<{ bodyFont: PublicMemoShare["bodyFont"] }>("/api/v1/me/note-body-font", {
        method: "PUT",
        body: JSON.stringify({ bodyFont }),
      }),

    getNoteProse: () => request<AccountNoteProse>("/api/v1/me/note-prose"),

    updateNoteProse: (patch: NoteProsePatch) =>
      request<AccountNoteProse>("/api/v1/me/note-prose", {
        method: "PUT",
        body: JSON.stringify(patch),
      }),

    unlockPublicMemoShare: (token: string, password: string) =>
      request<{ ok: true }>(`/api/public/shares/${encodeURIComponent(token)}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),

    listLoginDeviceSessions: () =>
      request<ListLoginDeviceSessionsResponse>("/api/v1/auth/sessions"),

    revokeLoginDeviceSession: (sessionId: string) =>
      request<{ ok: true }>(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),

    updateLoginDeviceSession: (sessionId: string, payload: { label: string | null }) =>
      request<{ ok: true }>(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    revokeOtherLoginDeviceSessions: () =>
      request<{ ok: true }>("/api/v1/auth/sessions", { method: "DELETE" }),

    login: (payload: LoginInput) =>
      request<AuthSession>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** Second login step after `login` rejected with `getMfaChallenge(error)`. */
    completeMfaLogin: (payload: LoginMfaInput) =>
      request<AuthSession>("/api/v1/auth/login/mfa", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getTotpStatus: () => request<TotpStatus>("/api/v1/auth/totp"),

    /** Starts enabling (password) or rebinding (password + code; none when restricted). */
    startTotpSetup: (payload: TotpReauthInput) =>
      request<TotpSetupResponse>("/api/v1/auth/totp/setup", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** Step 2: the code for the setup this client was shown (`setupId` from `startTotpSetup`). */
    verifyTotpSetup: (payload: TotpSetupVerifyInput) =>
      request<TotpRecoveryCodesResponse>("/api/v1/auth/totp/setup/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** Last step: activates exactly the batch the user saved (`batchId` from `verifyTotpSetup`). */
    confirmTotpSetup: (payload: TotpBatchConfirmInput) =>
      request<TotpConfirmResponse>("/api/v1/auth/totp/setup/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    regenerateRecoveryCodes: (payload: TotpReauthInput) =>
      request<TotpRecoveryCodesResponse>("/api/v1/auth/totp/recovery-codes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    /** Activates exactly the batch from `regenerateRecoveryCodes`; a replaced batch answers 409. */
    confirmRecoveryCodes: (payload: TotpBatchConfirmInput) =>
      request<{ ok: true }>("/api/v1/auth/totp/recovery-codes/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    disableTotp: (payload: TotpReauthInput) =>
      request<{ ok: true }>("/api/v1/auth/totp/disable", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    changePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      request<{ ok: true }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getObjectStorageSettings: () =>
      request<ObjectStorageSettingsResponse>("/api/v1/instance/object-storage"),

    testObjectStorageConnection: (payload: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
      objectPrefix: string;
    }) => request<{ ok: true }>("/api/v1/instance/object-storage/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    updateObjectStorageSettings: (payload:
      | { provider: "builtin" }
      | {
          provider: "s3";
          displayName: string;
          endpoint: string;
          region: string;
          bucket: string;
          accessKeyId: string;
          secretAccessKey?: string;
          forcePathStyle: boolean;
          objectPrefix: string;
        }) => request<ObjectStorageSettingsResponse>("/api/v1/instance/object-storage", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

    getTranscriptionSettings: () =>
      request<TranscriptionSettings>("/api/v1/ai/transcription-settings"),

    createTranscriptionProvider: (payload: TranscriptionProviderCreatePayload) =>
      request<TranscriptionSettings>("/api/v1/ai/transcription-providers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    updateTranscriptionProvider: (providerId: string, payload: TranscriptionProviderUpdatePayload) =>
      request<TranscriptionSettings>(`/api/v1/ai/transcription-providers/${encodeURIComponent(providerId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    deleteTranscriptionProvider: (providerId: string) =>
      request<TranscriptionSettings>(`/api/v1/ai/transcription-providers/${encodeURIComponent(providerId)}`, {
        method: "DELETE",
      }),

    addTranscriptionModel: (providerId: string, payload: { modelId: string; displayName?: string }) =>
      request<TranscriptionSettings>(`/api/v1/ai/transcription-providers/${encodeURIComponent(providerId)}/models`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    deleteTranscriptionModel: (providerId: string, modelConfigId: string) =>
      request<TranscriptionSettings>(
        `/api/v1/ai/transcription-providers/${encodeURIComponent(providerId)}/models/${encodeURIComponent(modelConfigId)}`,
        { method: "DELETE" },
      ),

    updateDefaultTranscriptionModel: (modelConfigId: string | null) =>
      request<TranscriptionSettings>("/api/v1/ai/transcription-default-model", {
        method: "PUT",
        body: JSON.stringify({ modelConfigId }),
      }),

    prepareNoteResourceTranscription: (memoId: string, resourceId: string, signal?: AbortSignal) =>
      request<{ baseUrl: string; modelId: string; apiKey: string; resourceId: string; filename: string }>(
        `/api/v1/memos/${encodeURIComponent(memoId)}/resources/${encodeURIComponent(resourceId)}/transcription-target`,
        { method: "POST", signal },
      ),

    getTranscriptionDirectCredential: (providerId: string, signal?: AbortSignal) =>
      request<{ apiKey: string }>(
        `/api/v1/ai/transcription-providers/${encodeURIComponent(providerId)}/direct-credential`,
        { method: "POST", signal },
      ),

    listUsers: () => request<ListUsersResponse>("/api/v1/users"),

    getInstanceStorageUsage: () => request<InstanceStorageUsageResponse>("/api/v1/instance/storage-usage"),

    createUser: (payload: { username: string; displayName?: string | null; password: string }) =>
      request<UserResponse>("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    updateUser: (userId: string, payload: { displayName?: string | null; password?: string; isDisabled?: boolean }) =>
      request<UserResponse>(`/api/v1/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    logout: () =>
      request<{ ok: true }>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      }),

    listNotebooks: () => request<ListNotebooksResponse>("/api/v1/notebooks"),

    syncBootstrap: (params?: { afterId?: string | null; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.afterId) {
        search.set("afterId", params.afterId);
        search.set("includeMetadata", "0");
      }
      if (params?.limit) search.set("limit", String(params.limit));
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<SyncBootstrapResponse>(`/api/v1/sync/bootstrap${suffix}`);
    },

    syncChanges: (params: { cursor: number; limit?: number }) => {
      const search = new URLSearchParams({ cursor: String(params.cursor) });
      if (params.limit) search.set("limit", String(params.limit));
      return request<SyncChangesResponse>(`/api/v1/sync/changes?${search.toString()}`);
    },

    getMobileSyncBootstrapPage: (afterId: string | null = null, limit = 100) => {
      const search = new URLSearchParams({ limit: String(limit) });
      if (afterId) {
        search.set("afterId", afterId);
        search.set("includeMetadata", "0");
      }
      return request<MobileSyncBootstrapPage>(`/api/v1/sync/bootstrap?${search.toString()}`);
    },

    getMobileSyncChanges: (cursor: number, limit = 100) =>
      request<MobileSyncChangesPage>(`/api/v1/sync/changes?cursor=${cursor}&limit=${limit}`),

    createNotebook: (payload: { name: string; parentId?: string | null }) =>
      request<NotebookResponse>("/api/v1/notebooks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    updateNotebook: (notebookId: string, payload: NotebookUpdateInput) =>
      request<NotebookResponse>(`/api/v1/notebooks/${encodeURIComponent(notebookId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    deleteNotebook: (notebookId: string) =>
      request<{ ok: true }>(`/api/v1/notebooks/${encodeURIComponent(notebookId)}`, {
        method: "DELETE",
      }),

    restoreNotebook: (notebookId: string) =>
      request<NotebookResponse>(`/api/v1/notebooks/${encodeURIComponent(notebookId)}/restore`, {
        method: "POST",
      }),

    listTags: () => request<ListTagsResponse>("/api/v1/tags"),

    renameTag: (tag: string, name: string) =>
      request<{ ok: true; updated: number }>(`/api/v1/tags/${encodeURIComponent(tag)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),

    deleteTag: (tag: string) =>
      request<{ ok: true; updated: number }>(`/api/v1/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      }),

    listApiTokens: () => request<ListApiTokensResponse>("/api/v1/api-tokens"),

    createApiToken: (payload: { name: string; scopes: string[]; expiresAt?: string | null }) =>
      request<CreatedApiToken>("/api/v1/api-tokens", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    revokeApiToken: (tokenId: string) =>
      request<{ ok: true }>(`/api/v1/api-tokens/${encodeURIComponent(tokenId)}`, {
        method: "DELETE",
      }),

    listMemos: (params: {
      notebookId?: string | null;
      includeTotal?: boolean;
      includeDescendants?: boolean;
      q?: string;
      tag?: string;
      trash?: boolean;
      sort?: MemoSortMode;
      filter?: MemoFilterMode;
      cursor?: string | null;
      limit?: number;
    }) => {
      const search = new URLSearchParams();

      if (params.notebookId) {
        search.set("notebookId", params.notebookId);
      }

      if (params.includeDescendants) {
        search.set("includeDescendants", "1");
      }

      if (params.q?.trim()) {
        search.set("q", params.q.trim());
      }

      if (params.tag?.trim()) {
        search.set("tag", params.tag.trim());
      }

      if (params.trash) {
        search.set("trash", "1");
      }

      if (params.sort) {
        search.set("sort", params.sort);
      }

      if (params.filter && params.filter !== "all") {
        search.set("filter", params.filter);
      }

      if (params.cursor) {
        search.set("cursor", params.cursor);
      }

      if (params.limit) {
        search.set("limit", String(params.limit));
      }

      if (params.includeTotal === false) search.set("includeTotal", "0");
      return request<ListMemosResponse>(`/api/v1/memos?${search.toString()}`);
    },

    getImportCapabilities: () => request<{ protocolVersion: number; maxBatchSize: number; formats: string[]; importContext: string; accountId: string | null }>("/api/v1/imports/capabilities"),

    importMemos: (payload: ImportMemosInput) => request<ImportMemosResponse>("/api/v1/imports/memos", { method: "POST", body: JSON.stringify(payload) }),

    createMemo: (payload: {
      notebookId: string;
      title?: string;
      contentJson?: TiptapDoc;
      contentMarkdown?: string;
      tags?: string[];
      createdAt?: string;
      updatedAt?: string;
    }) =>
      request<MemoResponse>("/api/v1/memos", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    listTemplates: () => request<ListTemplatesResponse>("/api/v1/templates"),

    createTemplate: (payload: {
      name: string;
      description?: string | null;
      memoId?: string;
      title?: string | null;
      contentJson?: unknown;
      contentMarkdown?: string;
      tags?: string[];
    }) => request<TemplateResponse>("/api/v1/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    updateTemplate: (templateId: string, payload: {
      name?: string;
      description?: string | null;
      title?: string | null;
      contentJson?: unknown;
      contentMarkdown?: string;
      tags?: string[];
    }) => request<TemplateResponse>(`/api/v1/templates/${encodeURIComponent(templateId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

    useTemplate: (templateId: string, notebookId: string, locale?: string) =>
      request<MemoResponse>(`/api/v1/templates/${encodeURIComponent(templateId)}/use`, {
        method: "POST",
        body: JSON.stringify(locale ? { notebookId, locale } : { notebookId }),
      }),

    deleteTemplate: (templateId: string) =>
      request<{ ok: true }>(`/api/v1/templates/${encodeURIComponent(templateId)}`, { method: "DELETE" }),

    listScheduledTasks: (executorDeviceId?: string) => {
      const search = new URLSearchParams();
      if (executorDeviceId) search.set("executorDeviceId", executorDeviceId);
      const suffix = search.size > 0 ? `?${search.toString()}` : "";
      return request<ListScheduledTasksResponse>(`/api/v1/scheduled-tasks${suffix}`);
    },

    listWorkspaceExtensions: () => request<ListWorkspaceExtensionsResponse>("/api/v1/workspace-extensions"),

    upsertWorkspaceExtension: (extensionId: string, payload: WorkspaceExtensionUpsertInput) =>
      request<WorkspaceExtensionResponse>(
        `/api/v1/workspace-extensions/${encodeURIComponent(extensionId)}`,
        { method: "PUT", body: JSON.stringify(payload) },
      ),

    deleteWorkspaceExtension: (extensionId: string) =>
      request<WorkspaceExtensionResponse>(
        `/api/v1/workspace-extensions/${encodeURIComponent(extensionId)}`,
        { method: "DELETE" },
      ),

    listScheduledTaskRunHistory: (offset = 0, limit = 50) => {
      const search = new URLSearchParams({ offset: String(offset), limit: String(limit) });
      return request<ScheduledTaskRunHistoryResponse>(`/api/v1/scheduled-task-runs?${search.toString()}`);
    },

    listPluginScheduledTasks: (pluginId: string) => request<ListScheduledTasksResponse>(
      `/api/v1/scheduled-tasks/plugin/${encodeURIComponent(pluginId)}`,
    ),

    upsertPluginScheduledTask: (payload: {
      pluginId: string;
      scheduleKey: string;
      name: string;
      commandId: string;
      cronExpression: string;
      timezone: string;
      executorDeviceId: string;
      missedRunPolicy?: "run-once" | "skip";
      isEnabled?: boolean;
    }) => request<ScheduledTaskResponse>("/api/v1/scheduled-tasks/plugin-upsert", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    deletePluginScheduledTask: (pluginId: string, scheduleKey: string) => request<{ ok: true }>(
      `/api/v1/scheduled-tasks/plugin/${encodeURIComponent(pluginId)}/${encodeURIComponent(scheduleKey)}`,
      { method: "DELETE" },
    ),

    createScheduledTask: (payload: {
      name: string;
      taskType: "plugin-command";
      taskPayload: { pluginId: string; commandId: string };
      cronExpression: string;
      timezone: string;
      executorDeviceId: string;
      missedRunPolicy?: "run-once" | "skip";
      isEnabled?: boolean;
    }) => request<ScheduledTaskResponse>("/api/v1/scheduled-tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

    updateScheduledTask: (taskId: string, payload: {
      name?: string;
      taskPayload?: { pluginId: string; commandId: string };
      cronExpression?: string;
      timezone?: string;
      executorDeviceId?: string;
      missedRunPolicy?: "run-once" | "skip";
      isEnabled?: boolean;
    }) => request<ScheduledTaskResponse>(`/api/v1/scheduled-tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

    deleteScheduledTask: (taskId: string) => request<{ ok: true }>(
      `/api/v1/scheduled-tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" },
    ),

    listScheduledTaskRuns: (taskId: string, offset = 0, limit = 50) => {
      const search = new URLSearchParams({ offset: String(offset), limit: String(limit) });
      return request<ScheduledTaskRunsResponse>(
        `/api/v1/scheduled-tasks/${encodeURIComponent(taskId)}/runs?${search.toString()}`,
      );
    },

    claimScheduledTaskRun: (taskId: string, payload: {
      scheduledFor: string;
      executorDeviceId: string;
    }) => request<ScheduledTaskRunResponse>(
      `/api/v1/scheduled-tasks/${encodeURIComponent(taskId)}/runs/claim`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

    finishScheduledTaskRun: (taskId: string, runId: string, payload: {
      executorDeviceId: string;
      status: "succeeded" | "failed";
      errorMessage?: string | null;
    }) => request<ScheduledTaskRunResponse>(
      `/api/v1/scheduled-tasks/${encodeURIComponent(taskId)}/runs/${encodeURIComponent(runId)}/finish`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

    moveMemos: (payload: { memoIds: string[]; notebookId: string }) =>
      request<{ ok: true; moved: number }>("/api/v1/memos/batch/move", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    deleteMemos: (payload: { memoIds: string[]; permanent?: boolean }) =>
      request<{ ok: true; deleted: number }>("/api/v1/memos/batch/delete", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    emptyTrash: () =>
      request<{ ok: true; deleted: number }>("/api/v1/memos/trash/empty", {
        method: "DELETE",
      }),

    getMemo: (memoId: string, options?: { includeDeleted?: boolean }) => {
      const search = new URLSearchParams();

      if (options?.includeDeleted) {
        search.set("includeDeleted", "1");
      }

      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<MemoResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}${suffix}`);
    },

    getMemoShare: (memoId: string) =>
      request<MemoShareResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/share`),

    listMemoShares: (offset = 0, limit = 50) =>
      request<ListMemoSharesResponse>(`/api/v1/memo-shares?offset=${offset}&limit=${limit}`),

    createMemoShare: (memoId: string) =>
      request<{ share: MemoShare }>(`/api/v1/memos/${encodeURIComponent(memoId)}/share`, {
        method: "POST",
        body: JSON.stringify({}),
      }),

    updateMemoShare: (memoId: string, payload: { passwordProtected?: boolean; password?: string; slug?: string | null; showUpdatedAt?: boolean; showBranding?: boolean; expiresAt?: string | null }) =>
      request<{ share: MemoShare }>(`/api/v1/memos/${encodeURIComponent(memoId)}/share`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    getTableForm: (memoId: string) =>
      request<{ form: TableFormSettings | null }>(`/api/v1/memos/${encodeURIComponent(memoId)}/form`),

    updateTableForm: (memoId: string, payload: TableFormUpdateInput) =>
      request<{ form: TableFormSettings }>(`/api/v1/memos/${encodeURIComponent(memoId)}/form`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    getPublicTableForm: (token: string) =>
      request<{ form: PublicTableForm }>(`/api/public/forms/${encodeURIComponent(token)}`),

    unlockPublicTableForm: (token: string, password: string) =>
      request<{ ok: true }>(`/api/public/forms/${encodeURIComponent(token)}/unlock`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),

    submitPublicTableForm: (token: string, cells: Record<string, unknown>) =>
      request<{ ok: true }>(`/api/public/forms/${encodeURIComponent(token)}/submissions`, {
        method: "POST",
        body: JSON.stringify({ cells }),
      }),

    uploadPublicTableFormFile: (token: string, file: File) => {
      const form = new FormData();
      form.append("file", file, file.name || "attachment");
      return request<{ resource: { id: string; filename: string; mimeType: string; byteSize: number } }>(
        `/api/public/forms/${encodeURIComponent(token)}/resources`,
        { method: "POST", body: form },
      );
    },

    revokeMemoShare: (memoId: string) =>
      request<{ ok: true }>(`/api/v1/memos/${encodeURIComponent(memoId)}/share`, { method: "DELETE" }),

    createMemoEditSession: (memoId: string) =>
      request<{ editSession: MemoEditSession }>(`/api/v1/memos/${encodeURIComponent(memoId)}/edit-sessions`, {
        method: "POST",
        body: JSON.stringify({}),
      }),

    listMemoRevisions: (memoId: string) => request<ListMemoRevisionsResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/revisions`),

    restoreMemoRevision: (memoId: string, revisionId: string) =>
      request<MemoResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/revisions/${encodeURIComponent(revisionId)}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      }),

    listResources: () => request<ListResourcesResponse>("/api/v1/resources"),

    renameResource: (resourceId: string, filename: string) =>
      request<ResourceResponse>(`/api/v1/resources/${encodeURIComponent(resourceId)}`, {
        method: "PATCH",
        body: JSON.stringify({ filename }),
      }),

    updateResourceContent: (resourceId: string, file: Blob, expectedContentHash: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("expectedContentHash", expectedContentHash);
      form.append("mimeType", file.type || "application/octet-stream");
      if (file instanceof File) form.append("filename", file.name);
      return request<ResourceResponse>(`/api/v1/resources/${encodeURIComponent(resourceId)}/blob`, {
        method: "PUT",
        body: form,
      });
    },

    deleteResource: (resourceId: string) =>
      request<{ ok: true }>(`/api/v1/resources/${encodeURIComponent(resourceId)}`, {
        method: "DELETE",
      }),

    getMarkdownExportPage: (offset = 0, limit = 50, memoIds?: string[], cursor?: string) => {
      const search = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
      });
      if (memoIds && memoIds.length > 0) {
        search.set("ids", memoIds.join(","));
      }
      if (offset > 0) search.set("includeTotal", "0");
      if (cursor !== undefined) search.set("cursor", cursor);
      return request<MarkdownExportPage>(`/api/v1/exports/markdown?${search.toString()}`);
    },

    getJsonBackupPage: (offset = 0, limit = 25, cursor?: string) => {
      const search = new URLSearchParams({ offset: String(offset), limit: String(limit) });
      if (offset > 0) search.set("includeTotal", "0");
      if (cursor !== undefined) search.set("cursor", cursor);
      return request<JsonBackupPage>(`/api/v1/backups/json?${search}`);
    },

    restoreJsonNotebooks: (notebooks: JsonBackupNotebook[]) =>
      request<{ ok: true }>("/api/v1/restores/json/notebooks", {
        method: "POST",
        body: JSON.stringify({ notebooks }),
      }),

    restoreJsonMemos: (memos: JsonBackupMemo[]) =>
      request<{ ok: true }>("/api/v1/restores/json/memos", {
        method: "POST",
        body: JSON.stringify({ memos }),
      }),

    createJsonResourceRestoreSink,

    restoreJsonResource: async (resourceId: string, metadata: JsonBackupMemo["resources"][number], file: Blob) => {
      const sink = await createJsonResourceRestoreSink(resourceId, metadata);
      const reader = file.stream().getReader();
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          await sink.write(next.value);
        }
        await sink.close();
        return { ok: true as const };
      } catch (error) {
        await sink.abort();
        throw error;
      } finally {
        reader.releaseLock();
      }
    },

    getResourceResponse: (resourceUrl: string, init?: RequestInit) =>
      requestResourceResponse(resourceUrl, init),

    getResourceBlob: (resourceUrl: string) => requestBlob(resourceUrl),

    downloadGithubPluginAsset: (
      owner: string,
      repository: string,
      releaseTag: string,
      assetName: "manifest.json" | "main.js" | "styles.css",
    ) => requestArrayBuffer(
      `/api/v1/plugins/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/releases/${encodeURIComponent(releaseTag)}/assets/${encodeURIComponent(assetName)}`,
    ),

    downloadGithubPluginAssetById: (
      owner: string,
      repository: string,
      assetId: string,
      assetName: "manifest.json" | "main.js" | "styles.css",
    ) => requestArrayBuffer(
      `/api/v1/plugins/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/assets/${encodeURIComponent(assetId)}/${encodeURIComponent(assetName)}`,
    ),

    getGithubPluginRepositoryManifest: async (owner: string, repository: string) => {
      const path = `/api/v1/plugins/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/manifest`;
      const { context, response } = await send(path, undefined, { setJsonContentType: false });
      if (!response.ok) await throwRequestError(context, response, "GitHub plugin manifest request failed");
      return response.text();
    },

    getGithubPluginLatestManifest: async (owner: string, repository: string) => {
      const path = `/api/v1/plugins/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/latest-manifest`;
      const { context, response } = await send(path, undefined, { setJsonContentType: false });
      if (!response.ok) await throwRequestError(context, response, "GitHub plugin latest-release manifest request failed");
      return response.text();
    },

    getCommunityPluginRegistry: async () => {
      const { context, response } = await send("/api/v1/plugins/community-registry", undefined, { setJsonContentType: false });
      if (response.status === 404) return null;
      if (!response.ok) await throwRequestError(context, response, "Community registry request failed");
      return {
        bytes: await response.arrayBuffer(),
        signatureBase64: response.headers.get("x-edgeever-community-registry-signature") ?? "",
      };
    },

    getGithubPluginRelease: async (owner: string, repository: string, releaseTag: string) => {
      const path = `/api/v1/plugins/github/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/releases/tags/${encodeURIComponent(releaseTag)}`;
      const { context, response } = await send(path, undefined, { setJsonContentType: false });
      if (response.status === 404) return null;
      if (!response.ok) await throwRequestError(context, response, "GitHub plugin release request failed");
      return response.json() as Promise<{
        tag_name: string;
        draft: boolean;
        assets: Array<{
          id: number;
          name: string;
          size: number;
          url: string;
          browser_download_url: string;
          digest?: string;
        }>;
      }>;
    },

    uploadMemoResource: (memoId: string, file: Blob | FormData) => {
      // Small files do not benefit from an upload session's three round trips.
      // Keep large attachments on the bounded-memory, resumable path.
      if (!(file instanceof FormData) && file.size > MAX_SINGLE_REQUEST_UPLOAD_BYTES) {
        return uploadMemoResourceMultipart(memoId, file);
      }
      const form = file instanceof FormData ? file : new FormData();
      if (!(file instanceof FormData)) {
        const filename = "name" in file && typeof file.name === "string" && file.name.trim()
          ? file.name
          : "attachment";
        form.append("file", file, filename);
      }
      return request<ResourceResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/resources`, {
        method: "POST",
        body: form,
      });
    },

    claimPosterRender: () => request<{ job: null | { id: string; memoId: string; expectedRevision: number; templateId: string | null; claimToken: string; expiresAt: string } }>("/api/v1/poster-render/claim", { method: "POST", body: "{}" }),
    completePosterRender: (id: string, input: { claimToken: string; document?: import("@edgeever/shared").PosterDocument; errorCode?: "render_failed" | "revision_conflict" | "client_timeout" }) => request<{ job: { status: string } }>(`/api/v1/poster-render/${encodeURIComponent(id)}/complete`, { method: "POST", body: JSON.stringify(input) }),
    uploadMemoResourceParts,

    updateMemo: (
      memoId: string,
      payload: {
        expectedRevision?: number;
        expectedContentHash?: string;
        editSessionId?: string;
        notebookId?: string;
        title?: string;
        isPinned?: boolean;
        contentJson?: TiptapDoc;
        contentMarkdown?: string;
        tags?: string[];
        createdAt?: string;
        updatedAt?: string;
        allowDestructiveOverwrite?: boolean;
      }
    ) =>
      request<MemoResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    deleteMemo: (memoId: string, options?: { permanent?: boolean }) => {
      const search = new URLSearchParams();

      if (options?.permanent) {
        search.set("permanent", "1");
      }

      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<{ ok: true }>(`/api/v1/memos/${encodeURIComponent(memoId)}${suffix}`, {
        method: "DELETE",
      });
    },

    restoreMemo: (memoId: string) =>
      request<MemoResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      }),

    duplicateMemo: (memoId: string, payload: { notebookId?: string; title?: string } = {}) =>
      request<MemoResponse>(`/api/v1/memos/${encodeURIComponent(memoId)}/duplicate`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    mergeMemos: (payload: { memoIds: string[]; notebookId?: string; title?: string }) =>
      request<MemoResponse>("/api/v1/memos/merge", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    resetDemo: () =>
      request<{ success: true }>("/api/v1/demo/reset", {
        method: "POST",
      }),
  };
};

const normalizeBaseUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
};

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);
