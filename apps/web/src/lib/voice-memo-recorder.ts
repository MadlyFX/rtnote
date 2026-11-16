import type { TiptapDoc } from "@edgeever/shared";
import { VOICE_MEMO_NODE_TYPE, createVoiceMemoClientId, createVoiceMemoFilename } from "@edgeever/shared/voice-memo-names";

/**
 * Voice memo recording in the browser and desktop app.
 *
 * A session owns the microphone, the MediaRecorder, the timer and the upload.
 * Sessions live outside React and are keyed by the voice memo block's
 * `clientId`, so switching notes or scrolling a block out of view never stops
 * a recording. The block that matches a finished session applies its result.
 */

export type VoiceMemoUploadedResource = {
  id?: string | null;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
};

export type VoiceMemoUploader = (file: File) => Promise<VoiceMemoUploadedResource>;

export type VoiceMemoRecordingResult = {
  url: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  durationMs: number;
  /** The file is kept on this device and uploads once the app is online. */
  savedOffline: boolean;
};

export type VoiceMemoSessionStatus =
  | "preparing"
  | "recording"
  | "paused"
  | "saving"
  | "saved"
  | "failed"
  | "error";

export type VoiceMemoStartError = "micDenied" | "micUnavailable" | "unsupported" | "failed";

export type VoiceMemoSessionSnapshot = {
  clientId: string;
  memoId: string;
  status: VoiceMemoSessionStatus;
  elapsedMs: number;
  maxDurationMs: number;
  /** Recent microphone levels from 0 to 1, oldest first. */
  levels: readonly number[];
  maxReached: boolean;
  startError: VoiceMemoStartError | null;
  uploadError: string | null;
  result: VoiceMemoRecordingResult | null;
};

export type VoiceMemoRecordingFormat = { mimeType: string; extension: string };

const RECORDING_FORMATS: VoiceMemoRecordingFormat[] = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  // Safari records AAC in MP4.
  { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
];

/** The first recording format the browser supports, or null. */
export const pickVoiceMemoRecordingFormat = (
  isTypeSupported: (mimeType: string) => boolean,
): VoiceMemoRecordingFormat | null => RECORDING_FORMATS.find((format) => {
  try {
    return isTypeSupported(format.mimeType);
  } catch {
    return false;
  }
}) ?? null;

/** File extension and plain MIME type for what a recorder actually produced. */
export const describeRecordedAudio = (recordedMimeType: string, fallback: VoiceMemoRecordingFormat) => {
  const type = recordedMimeType.split(";")[0]?.trim().toLowerCase() || fallback.mimeType.split(";")[0]!;
  if (type === "audio/mp4" || type === "video/mp4") return { mimeType: "audio/mp4", extension: "m4a" };
  if (type === "audio/ogg") return { mimeType: "audio/ogg", extension: "ogg" };
  if (type === "audio/webm" || type === "video/webm") return { mimeType: "audio/webm", extension: "webm" };
  return { mimeType: type, extension: fallback.extension };
};

/** Maps a getUserMedia failure to what the block tells the user. */
export const classifyMicrophoneError = (error: unknown): VoiceMemoStartError => {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "micDenied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "micUnavailable";
  if (name === "NotSupportedError" || name === "TypeError") return "unsupported";
  return "failed";
};

/** Root mean square of a time-domain sample buffer, scaled to 0..1. */
export const measureLevel = (samples: ArrayLike<number>) => {
  if (!samples.length) return 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = (samples[index]! - 128) / 128;
    sum += value * value;
  }
  // Speech rarely exceeds ~0.3 RMS; scale so normal speech fills most of the meter.
  return Math.min(1, Math.sqrt(sum / samples.length) * 3);
};

/** Elapsed recording time, excluding pauses. */
export const elapsedRecordingMs = (accumulatedMs: number, runningSince: number | null, now: number) =>
  accumulatedMs + (runningSince === null ? 0 : Math.max(0, now - runningSince));

const LEVEL_HISTORY = 32;
const TICK_MS = 100;

/**
 * WebM files from MediaRecorder have no duration or seek index, so players show
 * no length and cannot seek. Remuxing (no re-encoding) writes both.
 */
const finalizeWebm = async (blob: Blob): Promise<Blob> => {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Output, WebMOutputFormat } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
    const conversion = await Conversion.init({ input, output });
    if (!conversion.isValid) return blob;
    await conversion.execute();
    const buffer = output.target.buffer;
    return buffer && buffer.byteLength > 0 ? new Blob([buffer], { type: "audio/webm" }) : blob;
  } finally {
    input.dispose();
  }
};

type Listener = () => void;

export type StartVoiceMemoOptions = {
  clientId: string;
  memoId: string;
  maxDurationMinutes: number;
  upload: VoiceMemoUploader;
  /** Localized prefix for the file name, for example "Voice memo". */
  filenamePrefix: string;
};

class VoiceMemoSession {
  private listeners = new Set<Listener>();
  private snapshot: VoiceMemoSessionSnapshot;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Uint8Array<ArrayBuffer> | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private accumulatedMs = 0;
  private runningSince: number | null = null;
  private startedAt = new Date();
  private format: VoiceMemoRecordingFormat = RECORDING_FORMATS[0]!;
  private file: File | null = null;
  private discarded = false;

  constructor(private readonly options: StartVoiceMemoOptions, private readonly onSettled: () => void) {
    this.snapshot = {
      clientId: options.clientId,
      memoId: options.memoId,
      status: "preparing",
      elapsedMs: 0,
      maxDurationMs: Math.max(1, options.maxDurationMinutes) * 60_000,
      levels: [],
      maxReached: false,
      startError: null,
      uploadError: null,
      result: null,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Whether closing the page now would lose audio. */
  get holdsUnsavedAudio() {
    return ["preparing", "recording", "paused", "saving", "failed"].includes(this.snapshot.status);
  }

  /** The recorded file, kept until it is saved so the user can download it. */
  get recordedFile() {
    return this.file;
  }

  private update(patch: Partial<VoiceMemoSessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  async start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      this.update({ status: "error", startError: "unsupported" });
      return;
    }
    const format = pickVoiceMemoRecordingFormat((type) => MediaRecorder.isTypeSupported(type));
    if (!format) {
      this.update({ status: "error", startError: "unsupported" });
      return;
    }
    this.format = format;
    this.update({ status: "preparing", startError: null });
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      this.update({ status: "error", startError: classifyMicrophoneError(error) });
      return;
    }
    if (this.discarded) {
      this.releaseMicrophone();
      return;
    }
    try {
      this.recorder = new MediaRecorder(this.stream, { mimeType: format.mimeType, audioBitsPerSecond: 64_000 });
    } catch {
      this.releaseMicrophone();
      this.update({ status: "error", startError: "unsupported" });
      return;
    }
    this.chunks = [];
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.addEventListener("stop", () => void this.finish());
    this.recorder.addEventListener("error", () => {
      if (this.snapshot.status === "recording" || this.snapshot.status === "paused") this.stop();
    });
    this.startLevelMeter();
    this.startedAt = new Date();
    this.accumulatedMs = 0;
    this.runningSince = performance.now();
    // A one-second timeslice keeps the audio recorded so far if the tab crashes mid-stop.
    this.recorder.start(1000);
    this.update({ status: "recording", elapsedMs: 0 });
    this.timer = setInterval(this.tick, TICK_MS);
  }

  private startLevelMeter() {
    if (!this.stream || typeof AudioContext === "undefined") return;
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.samples = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
      source.connect(this.analyser);
    } catch {
      this.analyser = null;
    }
  }

  private tick = () => {
    const elapsedMs = elapsedRecordingMs(this.accumulatedMs, this.runningSince, performance.now());
    let levels = this.snapshot.levels;
    if (this.snapshot.status === "recording" && this.analyser && this.samples) {
      this.analyser.getByteTimeDomainData(this.samples);
      levels = [...levels, measureLevel(this.samples)].slice(-LEVEL_HISTORY);
    }
    this.update({ elapsedMs, levels });
    if (elapsedMs >= this.snapshot.maxDurationMs && (this.snapshot.status === "recording" || this.snapshot.status === "paused")) {
      this.update({ maxReached: true });
      this.stop();
    }
  };

  pause() {
    if (this.snapshot.status !== "recording" || this.recorder?.state !== "recording") return;
    this.recorder.pause();
    this.accumulatedMs = elapsedRecordingMs(this.accumulatedMs, this.runningSince, performance.now());
    this.runningSince = null;
    this.update({ status: "paused", elapsedMs: this.accumulatedMs, levels: [] });
  }

  resume() {
    if (this.snapshot.status !== "paused" || this.recorder?.state !== "paused") return;
    this.recorder.resume();
    this.runningSince = performance.now();
    this.update({ status: "recording" });
  }

  stop() {
    if (this.snapshot.status !== "recording" && this.snapshot.status !== "paused") return;
    this.accumulatedMs = elapsedRecordingMs(this.accumulatedMs, this.runningSince, performance.now());
    this.runningSince = null;
    this.update({ status: "saving", elapsedMs: this.accumulatedMs, levels: [] });
    this.stopTimer();
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    } else {
      void this.finish();
    }
  }

  /** Stops without saving and releases the microphone. */
  discard() {
    this.discarded = true;
    this.stopTimer();
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.releaseMicrophone();
    this.chunks = [];
    this.file = null;
    this.onSettled();
  }

  private stopTimer() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private releaseMicrophone() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.analyser = null;
  }

  private async finish() {
    this.releaseMicrophone();
    if (this.discarded) return;
    const recorded = describeRecordedAudio(this.recorder?.mimeType || this.chunks[0]?.type || "", this.format);
    let blob: Blob = new Blob(this.chunks, { type: recorded.mimeType });
    this.chunks = [];
    if (!blob.size) {
      this.update({ status: "failed", uploadError: "The recording is empty." });
      return;
    }
    if (recorded.mimeType === "audio/webm") {
      blob = await finalizeWebm(blob).catch(() => blob);
    }
    this.file = new File(
      [blob],
      createVoiceMemoFilename(this.startedAt, recorded.extension, this.options.filenamePrefix),
      { type: recorded.mimeType, lastModified: Date.now() },
    );
    await this.upload();
  }

  async upload() {
    const file = this.file;
    if (!file || this.discarded) return;
    this.update({ status: "saving", uploadError: null });
    try {
      const resource = await this.options.upload(file);
      if (this.discarded) return;
      const result: VoiceMemoRecordingResult = {
        url: resource.url,
        filename: resource.filename || file.name,
        mimeType: resource.mimeType || file.type,
        byteSize: resource.byteSize ?? file.size,
        durationMs: Math.round(this.snapshot.elapsedMs),
        savedOffline: Boolean(resource.id?.startsWith("local_resource_") || resource.url.startsWith("edgeever-staged:")),
      };
      this.file = null;
      this.update({ status: "saved", result });
    } catch (error) {
      if (this.discarded) return;
      this.update({ status: "failed", uploadError: error instanceof Error ? error.message : String(error) });
    }
  }
}

const sessions = new Map<string, VoiceMemoSession>();
const storeListeners = new Set<Listener>();
const autoStartIds = new Set<string>();
const mountedViews = new Map<string, number>();

let storeVersion = 0;
const notifyStore = () => {
  storeVersion += 1;
  storeListeners.forEach((listener) => listener());
};

let unloadGuardInstalled = false;
const installUnloadGuard = () => {
  if (unloadGuardInstalled || typeof window === "undefined") return;
  unloadGuardInstalled = true;
  window.addEventListener("beforeunload", (event) => {
    if (![...sessions.values()].some((session) => session.holdsUnsavedAudio)) return;
    event.preventDefault();
    event.returnValue = "";
  });
};

export const voiceMemoSessions = {
  get: (clientId: string) => sessions.get(clientId) ?? null,

  /** Starts recording for a block. Returns the existing session if there is one. */
  start(options: StartVoiceMemoOptions) {
    const existing = sessions.get(options.clientId);
    if (existing) return existing;
    installUnloadGuard();
    const session = new VoiceMemoSession(options, () => {
      sessions.delete(options.clientId);
      notifyStore();
    });
    sessions.set(options.clientId, session);
    session.subscribe(notifyStore);
    notifyStore();
    void session.start();
    return session;
  },

  /** Forgets a session once its block has taken the result, or was removed. */
  remove(clientId: string) {
    const session = sessions.get(clientId);
    if (!session) return;
    if (session.holdsUnsavedAudio) {
      session.discard();
      return;
    }
    sessions.delete(clientId);
    notifyStore();
  },

  /** Marks a just-inserted block to start recording as soon as it appears. */
  requestAutoStart(clientId: string) {
    autoStartIds.add(clientId);
  },

  consumeAutoStart(clientId: string) {
    return autoStartIds.delete(clientId);
  },

  /** Counts mounted blocks per session, so the app can show recordings with no visible block. */
  registerView(clientId: string) {
    mountedViews.set(clientId, (mountedViews.get(clientId) ?? 0) + 1);
    notifyStore();
    return () => {
      const count = (mountedViews.get(clientId) ?? 1) - 1;
      if (count > 0) mountedViews.set(clientId, count);
      else mountedViews.delete(clientId);
      notifyStore();
    };
  },

  /** Sessions still recording or saving whose block is not on screen. */
  listUnattended() {
    return [...sessions.values()].filter((session) =>
      !mountedViews.has(session.getSnapshot().clientId)
      && ["preparing", "recording", "paused", "saving", "failed"].includes(session.getSnapshot().status));
  },

  subscribe(listener: Listener) {
    storeListeners.add(listener);
    return () => {
      storeListeners.delete(listener);
    };
  },

  /** Changes whenever any session or mounted block changes; use with useSyncExternalStore. */
  getVersion: () => storeVersion,
};

/** A new note body that starts with a voice memo block ready to record. */
export const createVoiceMemoNoteContent = (): TiptapDoc => {
  const clientId = createVoiceMemoClientId();
  voiceMemoSessions.requestAutoStart(clientId);
  return { type: "doc", content: [{ type: VOICE_MEMO_NODE_TYPE, attrs: { clientId } }, { type: "paragraph" }] };
};

export type { VoiceMemoSession };
