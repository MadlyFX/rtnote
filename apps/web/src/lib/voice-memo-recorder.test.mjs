import { describe, expect, test } from "bun:test";
import {
  classifyMicrophoneError,
  createVoiceMemoNoteContent,
  describeRecordedAudio,
  elapsedRecordingMs,
  measureLevel,
  pickVoiceMemoRecordingFormat,
  voiceMemoSessions,
} from "./voice-memo-recorder.ts";

describe("voice memo recording format", () => {
  test("prefers WebM Opus, then MP4 for Safari", () => {
    expect(pickVoiceMemoRecordingFormat(() => true)).toEqual({ mimeType: "audio/webm;codecs=opus", extension: "webm" });
    expect(pickVoiceMemoRecordingFormat((type) => type.startsWith("audio/mp4"))).toEqual({ mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" });
    expect(pickVoiceMemoRecordingFormat(() => false)).toBeNull();
  });

  test("treats a throwing support check as unsupported", () => {
    expect(pickVoiceMemoRecordingFormat((type) => {
      if (type.startsWith("audio/webm")) throw new Error("boom");
      return type === "audio/ogg;codecs=opus";
    })).toEqual({ mimeType: "audio/ogg;codecs=opus", extension: "ogg" });
  });

  test("names files after what the recorder produced", () => {
    const fallback = { mimeType: "audio/webm;codecs=opus", extension: "webm" };
    expect(describeRecordedAudio("audio/webm;codecs=opus", fallback)).toEqual({ mimeType: "audio/webm", extension: "webm" });
    expect(describeRecordedAudio("video/mp4", fallback)).toEqual({ mimeType: "audio/mp4", extension: "m4a" });
    expect(describeRecordedAudio("", fallback)).toEqual({ mimeType: "audio/webm", extension: "webm" });
  });
});

describe("voice memo recorder helpers", () => {
  test("maps microphone errors", () => {
    expect(classifyMicrophoneError({ name: "NotAllowedError" })).toBe("micDenied");
    expect(classifyMicrophoneError({ name: "NotFoundError" })).toBe("micUnavailable");
    expect(classifyMicrophoneError({ name: "NotSupportedError" })).toBe("unsupported");
    expect(classifyMicrophoneError(new Error("other"))).toBe("failed");
  });

  test("measures silence as zero and loud input near one", () => {
    expect(measureLevel(new Uint8Array(64).fill(128))).toBe(0);
    expect(measureLevel(Uint8Array.from({ length: 64 }, (_, index) => (index % 2 ? 255 : 0)))).toBe(1);
    expect(measureLevel([])).toBe(0);
  });

  test("leaves paused time out of the elapsed time", () => {
    expect(elapsedRecordingMs(0, 1_000, 4_000)).toBe(3_000);
    expect(elapsedRecordingMs(3_000, null, 99_000)).toBe(3_000);
    expect(elapsedRecordingMs(3_000, 10_000, 12_500)).toBe(5_500);
  });
});

describe("voice memo sessions", () => {
  test("a new voice memo note starts recording once", () => {
    const doc = createVoiceMemoNoteContent();
    const clientId = doc.content[0].attrs.clientId;
    expect(doc.content[0].type).toBe("rtnoteVoiceMemo");
    expect(clientId).toMatch(/^vm_/);
    expect(voiceMemoSessions.consumeAutoStart(clientId)).toBe(true);
    expect(voiceMemoSessions.consumeAutoStart(clientId)).toBe(false);
  });

  test("tracks mounted blocks", () => {
    const before = voiceMemoSessions.getVersion();
    const release = voiceMemoSessions.registerView("vm_test");
    expect(voiceMemoSessions.getVersion()).toBeGreaterThan(before);
    release();
    expect(voiceMemoSessions.listUnattended()).toEqual([]);
  });
});
