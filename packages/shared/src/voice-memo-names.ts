/** Voice memo names and helpers, without editor dependencies. */
export const VOICE_MEMO_NODE_TYPE = "rtnoteVoiceMemo" as const;
export const VOICE_MEMO_TOKEN = "rtnoteVoiceMemo" as const;

/** Maximum recording lengths a user can pick, in minutes. */
export const VOICE_MEMO_MAX_DURATION_OPTIONS = [5, 15, 30, 60, 120] as const;
export type VoiceMemoMaxDurationMinutes = (typeof VOICE_MEMO_MAX_DURATION_OPTIONS)[number];
export const DEFAULT_VOICE_MEMO_MAX_DURATION_MINUTES: VoiceMemoMaxDurationMinutes = 30;

export const normalizeVoiceMemoMaxDuration = (value: unknown): VoiceMemoMaxDurationMinutes => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return (VOICE_MEMO_MAX_DURATION_OPTIONS as readonly number[]).includes(parsed)
    ? parsed as VoiceMemoMaxDurationMinutes
    : DEFAULT_VOICE_MEMO_MAX_DURATION_MINUTES;
};

/** A recording length in whole milliseconds, or null when unknown. */
export const normalizeVoiceMemoDuration = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};

/** `m:ss`, or `h:mm:ss` from one hour. */
export const formatVoiceMemoDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
};

/** File name for a new recording, for example `Voice memo 2026-11-15 14.03.22.webm`. */
export const createVoiceMemoFilename = (date: Date, extension: string, prefix = "Voice memo") => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
  const safePrefix = prefix.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Voice memo";
  return `${safePrefix} ${day} ${time}.${extension.replace(/^\.+/, "")}`;
};

/** A random id that links a pending voice memo block to its recorder. */
export const createVoiceMemoClientId = () => {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `vm_${random}`;
};
