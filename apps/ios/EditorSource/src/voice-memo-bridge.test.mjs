import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import { VOICE_MEMO_NODE_TYPE, createRTNoteDocumentExtensions } from "@rtnote/shared";
import { createRTNoteMathematics } from "@rtnote/shared/mathematics";
import {
  completeIosVoiceMemo,
  insertIosVoiceMemo,
  listIosPendingVoiceMemos,
  needsNativeAudioLoad,
} from "./voice-memo-bridge.ts";

const createEditor = (content = { type: "doc", content: [{ type: "paragraph" }] }) => {
  const editor = new Editor({
    extensions: createRTNoteDocumentExtensions({ mathematics: createRTNoteMathematics() }),
    content,
  });
  // Headless editors report isDestroyed without a mounted view; commands still work.
  Object.defineProperty(editor, "isDestroyed", { value: false, configurable: true });
  return editor;
};

const memos = (editor) => {
  const found = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === VOICE_MEMO_NODE_TYPE) found.push(node.attrs);
  });
  return found;
};

describe("iOS voice memo bridge", () => {
  test("inserts a pending recording and completes it once uploaded", () => {
    const editor = createEditor();
    expect(insertIosVoiceMemo(editor, JSON.stringify({
      clientId: "vm_1",
      filename: "Voice memo 2026-11-15 14.03.22.m4a",
      mimeType: "audio/mp4",
      byteSize: 1200,
      durationMs: 4200,
    }))).toBe(true);
    expect(listIosPendingVoiceMemos(editor)).toEqual(["vm_1"]);

    // A title typed while the upload was pending survives completion.
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === VOICE_MEMO_NODE_TYPE) {
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, title: "Standup" }));
      }
    });

    expect(completeIosVoiceMemo(editor, "vm_1", JSON.stringify({
      url: "/api/v1/resources/res_1/blob",
      byteSize: 1250,
    }))).toBe(true);
    expect(listIosPendingVoiceMemos(editor)).toEqual([]);
    expect(memos(editor)).toEqual([{
      url: "/api/v1/resources/res_1/blob",
      filename: "Voice memo 2026-11-15 14.03.22.m4a",
      mimeType: "audio/mp4",
      byteSize: 1250,
      durationMs: 4200,
      title: "Standup",
      transcript: "",
      clientId: "",
    }]);
  });

  test("rejects malformed or unknown requests", () => {
    const editor = createEditor();
    expect(insertIosVoiceMemo(editor, "not json")).toBe(false);
    expect(insertIosVoiceMemo(editor, JSON.stringify({ title: "no recording" }))).toBe(false);
    expect(completeIosVoiceMemo(editor, "vm_missing", JSON.stringify({ url: "/api/v1/resources/x/blob" }))).toBe(false);
    expect(memos(editor)).toEqual([]);
  });

  test("does not insert into a read-only editor", () => {
    const editor = createEditor();
    editor.setEditable(false);
    expect(insertIosVoiceMemo(editor, JSON.stringify({ url: "/api/v1/resources/x/blob" }))).toBe(false);
  });

  test("only server and remote URLs go through native loading", () => {
    expect(needsNativeAudioLoad("/api/v1/resources/x/blob")).toBe(true);
    expect(needsNativeAudioLoad("https://example.com/a.m4a")).toBe(true);
    expect(needsNativeAudioLoad("rtnote-res://local/x")).toBe(false);
    expect(needsNativeAudioLoad("data:audio/mp4;base64,AA==")).toBe(false);
    expect(needsNativeAudioLoad("")).toBe(false);
  });
});

describe("iOS voice memo insertion position", () => {
  const text = (value) => ({ type: "text", text: value });
  const paragraph = (value) => ({ type: "paragraph", content: value ? [text(value)] : [] });
  const pending = (clientId) => JSON.stringify({ clientId, mimeType: "audio/mp4" });
  const types = (editor) => editor.getJSON().content.map((node) =>
    node.type === VOICE_MEMO_NODE_TYPE ? `memo:${node.attrs.clientId}` : `${node.type}:${node.content?.map((child) => child.text).join("") ?? ""}`);

  test("a second recording never replaces the first", () => {
    const editor = createEditor();
    expect(insertIosVoiceMemo(editor, pending("vm_1"))).toBe(true);
    expect(insertIosVoiceMemo(editor, pending("vm_2"))).toBe(true);
    expect(types(editor)).toEqual(["memo:vm_1", "memo:vm_2", "paragraph:"]);
  });

  test("a selected memo stays when another is inserted", () => {
    const editor = createEditor();
    insertIosVoiceMemo(editor, pending("vm_1"));
    editor.commands.setNodeSelection(0);
    expect(insertIosVoiceMemo(editor, pending("vm_2"))).toBe(true);
    expect(types(editor)).toEqual(["memo:vm_1", "memo:vm_2", "paragraph:"]);
  });

  test("splits a paragraph at the caret and keeps selected text", () => {
    const editor = createEditor({ type: "doc", content: [paragraph("Hello world")] });
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(insertIosVoiceMemo(editor, pending("vm_1"))).toBe(true);
    expect(types(editor)).toEqual(["paragraph:Hello", "memo:vm_1", "paragraph: world"]);
  });

  test("goes after a paragraph when the caret is at its end", () => {
    const editor = createEditor({ type: "doc", content: [paragraph("Notes")] });
    editor.commands.setTextSelection(6);
    expect(insertIosVoiceMemo(editor, pending("vm_1"))).toBe(true);
    expect(types(editor)).toEqual(["paragraph:Notes", "memo:vm_1", "paragraph:"]);
  });
});
