import {
  VOICE_MEMO_NODE_TYPE,
  createVoiceMemoFilename,
  normalizeVoiceMemoDuration,
  type TiptapDoc,
} from "@edgeever/shared";
import { normalizeVoiceMemoMaxDuration } from "@edgeever/shared/voice-memo-names";

/** Android records AAC in an MPEG-4 container. */
export const MOBILE_VOICE_MEMO_MIME_TYPE = "audio/mp4";
export const MOBILE_VOICE_MEMO_EXTENSION = "m4a";

export type MobileVoiceMemoRecorderStatus = "idle" | "preparing" | "recording" | "paused" | "saving" | "error";

export type MobileVoiceMemoRecorderState = {
  status: MobileVoiceMemoRecorderStatus;
  /** Set once the recorder stopped because it reached the maximum length. */
  stoppedAtLimit: boolean;
  error: string | null;
};

export type MobileVoiceMemoRecorderEvent =
  | { type: "prepare" }
  | { type: "started" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop"; atLimit?: boolean }
  | { type: "fail"; error: string }
  | { type: "reset" };

export const INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE: MobileVoiceMemoRecorderState = {
  status: "idle",
  stoppedAtLimit: false,
  error: null,
};

/** Recorder transitions; events that make no sense in the current state are ignored. */
export const reduceMobileVoiceMemoRecorder = (
  state: MobileVoiceMemoRecorderState,
  event: MobileVoiceMemoRecorderEvent,
): MobileVoiceMemoRecorderState => {
  switch (event.type) {
    case "prepare":
      return state.status === "idle" || state.status === "error"
        ? { status: "preparing", stoppedAtLimit: false, error: null }
        : state;
    case "started":
      return state.status === "preparing" ? { ...state, status: "recording" } : state;
    case "pause":
      return state.status === "recording" ? { ...state, status: "paused" } : state;
    case "resume":
      return state.status === "paused" ? { ...state, status: "recording" } : state;
    case "stop":
      return state.status === "recording" || state.status === "paused"
        ? { ...state, status: "saving", stoppedAtLimit: Boolean(event.atLimit) }
        : state;
    case "fail":
      return { status: "error", stoppedAtLimit: false, error: event.error };
    case "reset":
      return INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE;
  }
};

/**
 * Maps expo-audio metering (dBFS, about -160 to 0) to a 0–1 level. Speech
 * sits roughly between -50 and -10 dBFS, so that range fills the meter.
 */
export const meteringToLevel = (metering: number | null | undefined) => {
  if (typeof metering !== "number" || !Number.isFinite(metering)) return 0;
  const level = (metering + 55) / 50;
  return Math.min(1, Math.max(0, level));
};

export const voiceMemoMaxDurationMs = (maxMinutes: unknown) => normalizeVoiceMemoMaxDuration(maxMinutes) * 60_000;

export const hasReachedVoiceMemoLimit = (durationMs: number, maxMinutes: unknown) =>
  durationMs >= voiceMemoMaxDurationMs(maxMinutes);

export const createMobileVoiceMemoFilename = (date = new Date()) =>
  createVoiceMemoFilename(date, MOBILE_VOICE_MEMO_EXTENSION);

export type MobileVoiceMemoRecording = {
  clientId: string;
  /** Durable copy of the recording, kept until it is uploaded. */
  uri: string;
  filename: string;
  mimeType: string;
  byteSize: number | null;
  durationMs: number | null;
  createdAt: string;
  /**
   * Set once the file uploaded. The record (and its file) is kept until the
   * note is seen holding the finished block, so a closed editor cannot lose it.
   */
  uploaded?: MobileVoiceMemoAttrs | null;
};

/** A finished recording, ready to insert as a voice memo block. */
export type MobileVoiceMemoAttrs = {
  url: string;
  filename: string;
  mimeType: string;
  byteSize: number | null;
  durationMs: number | null;
  title: string;
  transcript: string;
  clientId: string;
};

export const buildUploadedVoiceMemoAttrs = (
  recording: Pick<MobileVoiceMemoRecording, "filename" | "mimeType" | "byteSize" | "durationMs">,
  resource: { url: string; filename?: string | null; mimeType?: string | null; byteSize?: number | null },
): MobileVoiceMemoAttrs => ({
  url: resource.url,
  filename: resource.filename || recording.filename,
  mimeType: resource.mimeType || recording.mimeType,
  byteSize: resource.byteSize ?? recording.byteSize,
  durationMs: normalizeVoiceMemoDuration(recording.durationMs),
  title: "",
  transcript: "",
  clientId: "",
});

/** A block that waits for its recording to upload; the native view shows "Saving…". */
export const buildPendingVoiceMemoAttrs = (recording: MobileVoiceMemoRecording): MobileVoiceMemoAttrs => ({
  url: "",
  filename: recording.filename,
  mimeType: recording.mimeType,
  byteSize: recording.byteSize,
  durationMs: normalizeVoiceMemoDuration(recording.durationMs),
  title: "",
  transcript: "",
  clientId: recording.clientId,
});

const collectVoiceMemos = (doc: TiptapDoc | null | undefined) => {
  const pendingClientIds: string[] = [];
  const urls = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const current = node as { type?: unknown; attrs?: Record<string, unknown>; content?: unknown };
    if (current.type === VOICE_MEMO_NODE_TYPE) {
      const clientId = typeof current.attrs?.clientId === "string" ? current.attrs.clientId : "";
      const url = typeof current.attrs?.url === "string" ? current.attrs.url : "";
      if (url) urls.add(url);
      else if (clientId && !pendingClientIds.includes(clientId)) pendingClientIds.push(clientId);
      return;
    }
    if (Array.isArray(current.content)) current.content.forEach(visit);
  };
  visit(doc);
  return { pendingClientIds, urls };
};

/** Client ids of voice memo blocks in `doc` whose recording has not uploaded yet. */
export const findPendingVoiceMemoClientIds = (doc: TiptapDoc | null | undefined): string[] =>
  collectVoiceMemos(doc).pendingClientIds;

/**
 * What to do with stored recordings for the note in `doc`: upload the ones its
 * pending blocks still wait for, fill in blocks whose file already uploaded,
 * and forget recordings whose finished block the note now holds.
 */
export const planPendingVoiceMemos = (doc: TiptapDoc | null | undefined, records: MobileVoiceMemoRecording[]) => {
  const { pendingClientIds, urls } = collectVoiceMemos(doc);
  return {
    upload: records.filter((item) => !item.uploaded && pendingClientIds.includes(item.clientId)),
    complete: records.filter((item) => item.uploaded && pendingClientIds.includes(item.clientId)),
    forget: records.filter((item) => item.uploaded && urls.has(item.uploaded.url) && !pendingClientIds.includes(item.clientId)),
  };
};

const isRecording = (value: unknown): value is MobileVoiceMemoRecording => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.clientId === "string" && item.clientId.length > 0
    && typeof item.uri === "string" && item.uri.length > 0
    && typeof item.filename === "string"
    && typeof item.mimeType === "string"
    && typeof item.createdAt === "string";
};

/** Reads the stored pending-upload list, dropping malformed entries. */
export const parsePendingVoiceMemos = (value: string | null | undefined): MobileVoiceMemoRecording[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecording).map((item) => {
      const uploaded = item.uploaded && typeof item.uploaded === "object" && typeof item.uploaded.url === "string" && item.uploaded.url
        ? buildUploadedVoiceMemoAttrs(item, item.uploaded)
        : null;
      return {
        clientId: item.clientId,
        uri: item.uri,
        filename: item.filename,
        mimeType: item.mimeType,
        byteSize: typeof item.byteSize === "number" && item.byteSize > 0 ? item.byteSize : null,
        durationMs: normalizeVoiceMemoDuration(item.durationMs),
        createdAt: item.createdAt,
        ...(uploaded ? { uploaded } : {}),
      };
    });
  } catch {
    return [];
  }
};

export const upsertPendingVoiceMemo = (list: MobileVoiceMemoRecording[], recording: MobileVoiceMemoRecording) =>
  [...list.filter((item) => item.clientId !== recording.clientId), recording];

export const removePendingVoiceMemo = (list: MobileVoiceMemoRecording[], clientId: string) =>
  list.filter((item) => item.clientId !== clientId);

/** File name for the local audio cache of a resource URL. */
export const voiceMemoAudioCacheName = (url: string, mimeType?: string | null) => {
  const match = /\/api\/v1\/resources\/([^/?#]+)/.exec(url);
  const id = match ? decodeURIComponent(match[1]!) : url;
  const safeId = id.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 96) || "audio";
  const extension = mimeType?.includes("webm") ? "webm"
    : mimeType?.includes("ogg") ? "ogg"
    : mimeType?.includes("mpeg") ? "mp3"
    : "m4a";
  return `${safeId}.${extension}`;
};
