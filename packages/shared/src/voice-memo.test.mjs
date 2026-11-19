import { describe, expect, test } from "bun:test";
import { Editor, getSchema } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { DOMParser, DOMSerializer } from "@tiptap/pm/model";
import { parseHTML } from "linkedom";
import {
  VOICE_MEMO_NODE_TYPE,
  createRTNoteDocumentExtensions,
  createVoiceMemoFilename,
  docToMarkdown,
  docToText,
  formatVoiceMemoDuration,
  markdownToDoc,
  normalizeVoiceMemoMaxDuration,
  prepareNativeEditorContent,
  readVoiceMemoMarkdown,
  restoreNativeEditorContent,
  resolveMemoContentDoc,
  voiceMemoToMarkdown,
} from "./index.ts";
import { createRTNoteMarkdownMathematics } from "./mathematics-markdown.ts";

const text = (value) => ({ type: "text", text: value });
const paragraph = (value) => ({ type: "paragraph", content: value ? [text(value)] : [] });
const doc = (...content) => ({ type: "doc", content });
const memo = (attrs = {}) => ({
  type: VOICE_MEMO_NODE_TYPE,
  attrs: {
    url: "/api/v1/resources/res_1/blob",
    filename: "Voice memo 2026-11-15 14.03.22.webm",
    mimeType: "audio/webm",
    byteSize: 48213,
    durationMs: 42000,
    title: "Standup",
    transcript: "First point.\n\nSecond point.",
    clientId: "",
    ...attrs,
  },
});

describe("voice memo helpers", () => {
  test("formats durations", () => {
    expect(formatVoiceMemoDuration(0)).toBe("0:00");
    expect(formatVoiceMemoDuration(42_900)).toBe("0:42");
    expect(formatVoiceMemoDuration(61_000)).toBe("1:01");
    expect(formatVoiceMemoDuration(3_725_000)).toBe("1:02:05");
  });

  test("names recordings by date and time", () => {
    expect(createVoiceMemoFilename(new Date(2026, 10, 5, 9, 3, 7), "m4a")).toBe("Voice memo 2026-11-05 09.03.07.m4a");
    expect(createVoiceMemoFilename(new Date(2026, 10, 5, 9, 3, 7), ".webm", "Nota: voz")).toBe("Nota voz 2026-11-05 09.03.07.webm");
  });

  test("falls back to the default maximum length", () => {
    expect(normalizeVoiceMemoMaxDuration(60)).toBe(60);
    expect(normalizeVoiceMemoMaxDuration("15")).toBe(15);
    expect(normalizeVoiceMemoMaxDuration(7)).toBe(30);
    expect(normalizeVoiceMemoMaxDuration(undefined)).toBe(30);
  });
});

describe("voice memo Markdown", () => {
  test("links the file and round-trips metadata and transcript", () => {
    const markdown = docToMarkdown(doc(paragraph("Before"), memo(), paragraph("After")));
    expect(markdown).toContain("[Standup (0:42)](/api/v1/resources/res_1/blob)");
    expect(markdown).toContain("<!-- rtnote-voice-memo ");
    expect(markdown).toContain("Second point.");

    const parsed = markdownToDoc(markdown);
    const node = parsed.content.find((child) => child.type === VOICE_MEMO_NODE_TYPE);
    expect(node?.attrs).toEqual(memo().attrs);
    expect(parsed.content[0]).toEqual(paragraph("Before"));
    expect(parsed.content.at(-1)).toEqual(paragraph("After"));
  });

  test("keeps comment terminators in titles and transcripts", () => {
    const attrs = memo({ title: "a --> b", transcript: "ends --> here" }).attrs;
    const token = readVoiceMemoMarkdown(`${voiceMemoToMarkdown(attrs)}\n`);
    expect(token?.attrs.title).toBe("a --> b");
    expect(token?.attrs.transcript).toBe("ends --> here");
  });

  test("writes nothing for a recording that has not finished", () => {
    expect(voiceMemoToMarkdown(memo({ url: "", clientId: "vm_1" }).attrs)).toBe("");
  });

  test("ignores a block without a link", () => {
    expect(readVoiceMemoMarkdown("<!-- rtnote-voice-memo {} -->\nno link\n<!-- /rtnote-voice-memo -->\n")).toBeUndefined();
  });
});

describe("voice memo content", () => {
  test("search text includes the title and transcript", () => {
    expect(docToText(doc(paragraph("Notes"), memo()))).toBe("Notes Standup First point. Second point.");
  });

  test("keeps JSON when a note has a voice memo", () => {
    const current = doc(memo());
    expect(resolveMemoContentDoc(current, "[Standup](/api/v1/resources/res_1/blob)")).toBe(current);
  });

  test("native editors keep the node as is", () => {
    const current = doc(memo());
    const prepared = prepareNativeEditorContent(current);
    expect(prepared.content[0].type).toBe(VOICE_MEMO_NODE_TYPE);
    expect(restoreNativeEditorContent(prepared)).toEqual(current);
  });

  test("HTML shows the title, player and transcript and parses back", () => {
    const schema = getSchema(createRTNoteDocumentExtensions({ mathematics: createRTNoteMarkdownMathematics() }));
    const { document } = parseHTML("<!doctype html><html><body></body></html>");
    const node = schema.nodeFromJSON(memo());
    const fragment = DOMSerializer.fromSchema(schema).serializeFragment(schema.nodeFromJSON(doc(memo())).content, { document });
    const container = document.createElement("div");
    container.appendChild(fragment);
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("/api/v1/resources/res_1/blob");
    expect(container.querySelector("[data-voice-memo-title]")?.textContent).toBe("Standup");
    expect(container.querySelector("[data-voice-memo-transcript]")?.textContent).toBe("First point.\n\nSecond point.");

    const parsed = DOMParser.fromSchema(schema).parse(container).firstChild;
    expect(parsed?.type.name).toBe(VOICE_MEMO_NODE_TYPE);
    expect(parsed?.attrs).toEqual(node.attrs);
  });
});

describe("insertVoiceMemo", () => {
  const createEditor = (content) => new Editor({
    extensions: createRTNoteDocumentExtensions({ mathematics: createRTNoteMarkdownMathematics() }),
    content,
  });
  const types = (editor) => editor.getJSON().content.map((node) => node.type);

  test("puts a new memo after a selected memo instead of replacing it", () => {
    const editor = createEditor(doc(memo({ clientId: "" }), paragraph("After")));
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)));
    expect(editor.commands.insertVoiceMemo({ clientId: "vm_new" })).toBe(true);
    const memos = editor.getJSON().content.filter((node) => node.type === VOICE_MEMO_NODE_TYPE);
    expect(memos.map((node) => node.attrs.clientId)).toEqual(["", "vm_new"]);
    editor.destroy();
  });

  test("keeps selected text", () => {
    const editor = createEditor(doc(paragraph("Keep me")));
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 8)));
    editor.commands.insertVoiceMemo({ clientId: "vm_new" });
    expect(editor.getText()).toContain("Keep me");
    expect(types(editor)).toContain(VOICE_MEMO_NODE_TYPE);
    editor.destroy();
  });

  test("replaces an empty paragraph at the caret", () => {
    const editor = createEditor(doc(paragraph("Intro"), paragraph("")));
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.insertVoiceMemo({ clientId: "vm_new" });
    expect(types(editor).slice(0, 2)).toEqual(["paragraph", VOICE_MEMO_NODE_TYPE]);
    editor.destroy();
  });
});
