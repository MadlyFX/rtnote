import { describe, expect, test } from "bun:test";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { VOICE_MEMO_NODE_TYPE, createEdgeEverDocumentExtensions } from "@edgeever/shared";
import { completePendingVoiceMemo, findVoiceMemoMimeType, parseVoiceMemoAttrsJson } from "./mobile-voice-memo-editor";

const schema = getSchema(createEdgeEverDocumentExtensions({ mathematics: [] }));

const memo = (attrs: Record<string, unknown>) => ({ type: VOICE_MEMO_NODE_TYPE, attrs });
const stateOf = (...content: unknown[]) =>
  EditorState.create({ schema, doc: schema.nodeFromJSON({ type: "doc", content }) });
const uploaded = {
  url: "/api/v1/resources/res_1/blob",
  filename: "Voice memo 2026-11-15 14.03.22.m4a",
  mimeType: "audio/mp4",
  byteSize: 48_300,
  durationMs: 42_000,
};

describe("completing a pending voice memo", () => {
  test("fills in the matching block and keeps text typed meanwhile", () => {
    const state = stateOf(
      { type: "paragraph", content: [{ type: "text", text: "Before" }] },
      memo({ clientId: "vm_1", filename: "local.m4a", durationMs: 41_000, title: "Standup" }),
      memo({ clientId: "vm_2" }),
    );
    const tr = completePendingVoiceMemo(state, "vm_1", uploaded);
    expect(tr).not.toBeNull();
    const nodes = tr!.doc.toJSON().content as Array<{ type: string; attrs?: Record<string, unknown> }>;
    expect(nodes[1]!.attrs).toEqual({
      url: uploaded.url,
      filename: uploaded.filename,
      mimeType: "audio/mp4",
      byteSize: 48_300,
      durationMs: 42_000,
      title: "Standup",
      transcript: "",
      clientId: "",
    });
    expect(nodes[2]!.attrs?.clientId).toBe("vm_2");
  });

  test("does nothing when the block is gone or already uploaded", () => {
    expect(completePendingVoiceMemo(stateOf(memo({ clientId: "vm_2" })), "vm_1", uploaded)).toBeNull();
    expect(completePendingVoiceMemo(stateOf(memo({ clientId: "vm_1", url: "/api/v1/resources/old/blob" })), "vm_1", uploaded)).toBeNull();
    expect(completePendingVoiceMemo(stateOf(memo({ clientId: "vm_1" })), "vm_1", { ...uploaded, url: "" })).toBeNull();
  });

  test("finds the stored MIME type by URL", () => {
    const state = stateOf(memo({ url: uploaded.url, mimeType: "audio/webm" }));
    expect(findVoiceMemoMimeType(state, uploaded.url)).toBe("audio/webm");
    expect(findVoiceMemoMimeType(state, "/api/v1/resources/other/blob")).toBe("");
    expect(findVoiceMemoMimeType(null, uploaded.url)).toBe("");
  });

  test("parses bridge attributes", () => {
    expect(parseVoiceMemoAttrsJson(JSON.stringify({ url: uploaded.url, durationMs: "42000", byteSize: -3 }))).toEqual({
      url: uploaded.url,
      filename: "",
      mimeType: "",
      byteSize: null,
      durationMs: 42_000,
      title: "",
      transcript: "",
      clientId: "",
    });
    expect(parseVoiceMemoAttrsJson("[1]")).toBeNull();
    expect(parseVoiceMemoAttrsJson("{")).toBeNull();
  });
});
