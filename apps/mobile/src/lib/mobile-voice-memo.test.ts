import { describe, expect, test } from "bun:test";
import { VOICE_MEMO_NODE_TYPE, type TiptapDoc } from "@rtnote/shared";
import {
  INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE,
  buildPendingVoiceMemoAttrs,
  buildUploadedVoiceMemoAttrs,
  createMobileVoiceMemoFilename,
  findPendingVoiceMemoClientIds,
  hasReachedVoiceMemoLimit,
  meteringToLevel,
  parsePendingVoiceMemos,
  planPendingVoiceMemos,
  reduceMobileVoiceMemoRecorder,
  removePendingVoiceMemo,
  upsertPendingVoiceMemo,
  voiceMemoAudioCacheName,
  voiceMemoMaxDurationMs,
  type MobileVoiceMemoRecorderEvent,
  type MobileVoiceMemoRecording,
} from "./mobile-voice-memo";

const recording = (overrides: Partial<MobileVoiceMemoRecording> = {}): MobileVoiceMemoRecording => ({
  clientId: "vm_1",
  uri: "file:///data/user/0/com.madlyfx.rtnote/files/voice-memos/vm_1.m4a",
  filename: "Voice memo 2026-11-15 14.03.22.m4a",
  mimeType: "audio/mp4",
  byteSize: 48_213,
  durationMs: 42_000,
  createdAt: "2026-11-15T20:03:22.000Z",
  ...overrides,
});

const run = (...events: MobileVoiceMemoRecorderEvent[]) =>
  events.reduce(reduceMobileVoiceMemoRecorder, INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE);

describe("voice memo recorder state", () => {
  test("records, pauses, resumes and stops", () => {
    expect(run({ type: "prepare" }).status).toBe("preparing");
    expect(run({ type: "prepare" }, { type: "started" }).status).toBe("recording");
    expect(run({ type: "prepare" }, { type: "started" }, { type: "pause" }).status).toBe("paused");
    expect(run({ type: "prepare" }, { type: "started" }, { type: "pause" }, { type: "resume" }).status).toBe("recording");
    const stopped = run({ type: "prepare" }, { type: "started" }, { type: "stop", atLimit: true });
    expect(stopped).toEqual({ status: "saving", stoppedAtLimit: true, error: null });
  });

  test("ignores events that do not fit the current state", () => {
    expect(run({ type: "pause" }).status).toBe("idle");
    expect(run({ type: "stop" }).status).toBe("idle");
    expect(run({ type: "prepare" }, { type: "resume" }).status).toBe("preparing");
    expect(run({ type: "prepare" }, { type: "started" }, { type: "prepare" }).status).toBe("recording");
  });

  test("can start again after an error", () => {
    const failed = run({ type: "prepare" }, { type: "fail", error: "Microphone access was denied." });
    expect(failed).toEqual({ status: "error", stoppedAtLimit: false, error: "Microphone access was denied." });
    expect(reduceMobileVoiceMemoRecorder(failed, { type: "prepare" })).toEqual({ status: "preparing", stoppedAtLimit: false, error: null });
  });
});

describe("voice memo recorder helpers", () => {
  test("maps metering to a 0–1 level", () => {
    expect(meteringToLevel(-160)).toBe(0);
    expect(meteringToLevel(0)).toBe(1);
    expect(meteringToLevel(-30)).toBeCloseTo(0.5, 5);
    expect(meteringToLevel(undefined)).toBe(0);
    expect(meteringToLevel(Number.NaN)).toBe(0);
  });

  test("applies the maximum length, falling back to the default", () => {
    expect(voiceMemoMaxDurationMs(5)).toBe(300_000);
    expect(voiceMemoMaxDurationMs(7)).toBe(1_800_000);
    expect(hasReachedVoiceMemoLimit(299_999, 5)).toBe(false);
    expect(hasReachedVoiceMemoLimit(300_000, 5)).toBe(true);
  });

  test("names recordings as M4A files", () => {
    expect(createMobileVoiceMemoFilename(new Date(2026, 10, 15, 14, 3, 22))).toBe("Voice memo 2026-11-15 14.03.22.m4a");
  });

  test("names cached audio by resource id and type", () => {
    expect(voiceMemoAudioCacheName("/api/v1/resources/res_1/blob", "audio/mp4")).toBe("res_1.m4a");
    expect(voiceMemoAudioCacheName("https://notes.example.com/api/v1/resources/res%2F2/blob", "audio/webm")).toBe("res_2.webm");
  });
});

describe("voice memo blocks", () => {
  test("a pending block keeps the recording details and its client id", () => {
    expect(buildPendingVoiceMemoAttrs(recording())).toEqual({
      url: "",
      filename: "Voice memo 2026-11-15 14.03.22.m4a",
      mimeType: "audio/mp4",
      byteSize: 48_213,
      durationMs: 42_000,
      title: "",
      transcript: "",
      clientId: "vm_1",
    });
  });

  test("an uploaded block uses the resource and clears the client id", () => {
    expect(buildUploadedVoiceMemoAttrs(recording(), {
      url: "/api/v1/resources/res_1/blob",
      filename: "Voice memo 2026-11-15 14.03.22.m4a",
      mimeType: null,
      byteSize: 48_300,
    })).toEqual({
      url: "/api/v1/resources/res_1/blob",
      filename: "Voice memo 2026-11-15 14.03.22.m4a",
      mimeType: "audio/mp4",
      byteSize: 48_300,
      durationMs: 42_000,
      title: "",
      transcript: "",
      clientId: "",
    });
  });

  test("finds blocks still waiting for their upload", () => {
    const doc: TiptapDoc = {
      type: "doc",
      content: [
        { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "vm_1" } },
        { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "/api/v1/resources/res_2/blob", clientId: "" } },
        { type: "details", content: [{ type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "vm_3" } }] },
        { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "" } },
        { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "vm_1" } },
      ],
    };
    expect(findPendingVoiceMemoClientIds(doc)).toEqual(["vm_1", "vm_3"]);
    expect(findPendingVoiceMemoClientIds(null)).toEqual([]);
  });
});

describe("pending upload list", () => {
  test("round-trips and drops malformed entries", () => {
    const stored = JSON.stringify([recording(), { clientId: "", uri: "x" }, "nope", recording({ clientId: "vm_2", byteSize: -1, durationMs: "12" as unknown as number })]);
    expect(parsePendingVoiceMemos(stored)).toEqual([
      recording(),
      recording({ clientId: "vm_2", byteSize: null, durationMs: 12 }),
    ]);
    expect(parsePendingVoiceMemos("not json")).toEqual([]);
    expect(parsePendingVoiceMemos(null)).toEqual([]);
  });

  test("replaces an entry with the same client id and removes by id", () => {
    const list = upsertPendingVoiceMemo([recording(), recording({ clientId: "vm_2" })], recording({ byteSize: 1 }));
    expect(list.map((item) => [item.clientId, item.byteSize])).toEqual([["vm_2", 48_213], ["vm_1", 1]]);
    expect(removePendingVoiceMemo(list, "vm_2").map((item) => item.clientId)).toEqual(["vm_1"]);
  });
});

describe("planning pending recordings for an open note", () => {
  const uploadedAttrs = buildUploadedVoiceMemoAttrs(recording({ clientId: "vm_2" }), { url: "/api/v1/resources/res_2/blob" });
  const records = [
    recording({ clientId: "vm_1" }),
    recording({ clientId: "vm_2", uploaded: uploadedAttrs }),
    recording({ clientId: "vm_3" }),
  ];

  test("uploads waiting blocks and re-fills blocks whose file already uploaded", () => {
    const doc: TiptapDoc = { type: "doc", content: [
      { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "vm_1" } },
      { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "", clientId: "vm_2" } },
    ] };
    const plan = planPendingVoiceMemos(doc, records);
    expect(plan.upload.map((item) => item.clientId)).toEqual(["vm_1"]);
    expect(plan.complete.map((item) => item.clientId)).toEqual(["vm_2"]);
    expect(plan.forget).toEqual([]);
  });

  test("forgets a recording only once the note holds its finished block", () => {
    const finished: TiptapDoc = { type: "doc", content: [
      { type: VOICE_MEMO_NODE_TYPE, attrs: { url: "/api/v1/resources/res_2/blob", clientId: "" } },
    ] };
    expect(planPendingVoiceMemos(finished, records).forget.map((item) => item.clientId)).toEqual(["vm_2"]);
    // Another note (or a closed editor) never forgets it.
    expect(planPendingVoiceMemos({ type: "doc", content: [] }, records)).toEqual({ upload: [], complete: [], forget: [] });
  });

  test("keeps the uploaded attributes when stored", () => {
    const parsed = parsePendingVoiceMemos(JSON.stringify([recording({ uploaded: uploadedAttrs }), recording({ clientId: "vm_9", uploaded: { url: "" } as never })]));
    expect(parsed[0]!.uploaded?.url).toBe("/api/v1/resources/res_2/blob");
    expect(parsed[1]!.uploaded).toBeUndefined();
  });
});
