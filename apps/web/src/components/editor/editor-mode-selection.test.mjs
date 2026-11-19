import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import { createRTNoteDocumentExtensions, markdownToDoc } from "@rtnote/shared";
import { createRTNoteMathematics } from "@rtnote/shared/mathematics";
import { ensureTestWindowDom } from "../../lib/restore-test-global.mjs";
import { docToEditableMarkdown } from "./editor-mode-content.ts";
import { markdownOffsetToRichPosition, richPositionToMarkdownOffset } from "./editor-mode-selection.ts";

const createEditor = (source) => {
  ensureTestWindowDom();
  return new Editor({
    extensions: createRTNoteDocumentExtensions({ mathematics: createRTNoteMathematics() }),
    content: markdownToDoc(source),
  });
};

describe("Markdown mode cursor mapping", () => {
  test("keeps the caret after ordinary punctuation when entering source mode", () => {
    const editor = createEditor("Alpha [ ] & Bravo");
    const source = docToEditableMarkdown(editor.getJSON());
    const richPosition = 1 + "Alpha [ ] &".length;
    const sourceOffset = richPositionToMarkdownOffset(editor.state.doc, source, richPosition);

    expect(source).toBe("Alpha [ ] & Bravo");
    expect(sourceOffset).toBe("Alpha [ ] &".length);
    expect(markdownOffsetToRichPosition(editor.schema, editor.state.doc, source, sourceOffset)).toBe(richPosition);
    editor.destroy();
  });

  test("accounts for Markdown marks around a caret in formatted prose", () => {
    const editor = createEditor("Before **bold** after");
    const source = docToEditableMarkdown(editor.getJSON());
    const richPosition = 1 + "Before bold".length;
    const sourceOffset = richPositionToMarkdownOffset(editor.state.doc, source, richPosition);

    expect(sourceOffset).toBe(source.indexOf("** after"));
    expect(markdownOffsetToRichPosition(editor.schema, editor.state.doc, source, sourceOffset)).toBe(richPosition);
    editor.destroy();
  });

  test("keeps UTF-16 positions after Chinese text and emoji", () => {
    // "Traditional Chinese" and "after" in Chinese, escaped so the source stays English.
    const cjk = "\u7e41\u9ad4\u4e2d\u6587";
    const editor = createEditor(`${cjk}🙂 [ ] & \u5f8c\u6587`);
    const source = docToEditableMarkdown(editor.getJSON());
    const prefix = `${cjk}🙂 [ ] &`;
    const richPosition = 1 + prefix.length;
    const sourceOffset = richPositionToMarkdownOffset(editor.state.doc, source, richPosition);

    expect(sourceOffset).toBe(prefix.length);
    expect(markdownOffsetToRichPosition(editor.schema, editor.state.doc, source, sourceOffset)).toBe(richPosition);
    editor.destroy();
  });

  test("declines unsafe positions inside Markdown syntax", () => {
    const editor = createEditor("[RTNote](https://rtnote.example)");
    const source = docToEditableMarkdown(editor.getJSON());

    expect(markdownOffsetToRichPosition(editor.schema, editor.state.doc, source, source.indexOf("https") + 2)).toBeNull();
    editor.destroy();
  });
});
