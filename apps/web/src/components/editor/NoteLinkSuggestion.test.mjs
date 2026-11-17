import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { ensureTestWindowDom } from "../../lib/restore-test-global.mjs";
import {
  filterNoteLinkSuggestions,
  insertSuggestedNoteLink,
  createNoteLinkSuggestionExtension,
} from "./NoteLinkSuggestion.tsx";

const labels = {
  menu: "Link a note",
  empty: "No notes to link",
  close: "Close note links",
  untitled: "Untitled note",
};

const memo = (overrides) => ({
  id: "memo-1",
  title: "Project note",
  excerpt: "Project summary",
  isDeleted: false,
  ...overrides,
});

describe("note link suggestion", () => {
  const suggestionFor = (content) => {
    ensureTestWindowDom();
    const editor = new Editor({
      extensions: [StarterKit, createNoteLinkSuggestionExtension({
        getCurrentMemoId: () => null,
        getLabels: () => labels,
        searchMemos: async () => [],
      })],
      content: { type: "doc", content: [{ type: "paragraph", content }] },
    });
    try {
      const initialState = editor.state.reconfigure({ plugins: editor.extensionManager.plugins });
      const plugin = initialState.plugins.find((item) => item.key.startsWith("edgeever-note-link-suggestion$"));
      const state = initialState.apply(initialState.tr.setSelection(TextSelection.atEnd(initialState.doc)));
      return plugin.getState(state);
    } finally {
      editor.destroy();
    }
  };

  test("does not open for @ embedded in passwords, emails, or ordinary text", () => {
    // "text@note" in Chinese, escaped: CJK has no spaces, so an @ glued to it is ordinary text.
    const cjkText = "\u6587\u5b57@\u7b14\u8bb0";
    for (const text of ["secret+@F(", "user@example.com", cjkText, "hello@"]) {
      expect(suggestionFor([{ type: "text", text }]).active).toBe(false);
    }
  });

  test("opens at paragraph starts and after whitespace, including multiword queries", () => {
    for (const [text, query] of [["@", ""], ["@Project", "Project"], ["See @Project note", "Project note"], ["See\t@Project", "Project"], ["See\u3000@Project", "Project"]]) {
      const suggestion = suggestionFor([{ type: "text", text }]);
      expect(suggestion.active).toBe(true);
      expect(suggestion.query).toBe(query);
    }
  });

  test("formatting does not turn an embedded @ into a paragraph-start trigger", () => {
    expect(suggestionFor([
      { type: "text", text: "secret+" },
      { type: "text", text: "@F(", marks: [{ type: "bold" }] },
    ]).active).toBe(false);
    expect(suggestionFor([
      { type: "text", text: "See " },
      { type: "text", text: "@Project", marks: [{ type: "bold" }] },
    ]).active).toBe(true);
  });

  test("opens after a hard break but not immediately after inline code", () => {
    expect(suggestionFor([
      { type: "text", text: "See" },
      { type: "hardBreak" },
      { type: "text", text: "@Project" },
    ]).active).toBe(true);
    expect(suggestionFor([
      { type: "text", text: "user", marks: [{ type: "code" }] },
      { type: "text", text: "@example.com" },
    ]).active).toBe(false);
  });

  test("excludes the current and deleted notes", () => {
    expect(filterNoteLinkSuggestions([
      memo({ id: "current" }),
      memo({ id: "deleted", isDeleted: true }),
      memo({ id: "available" }),
    ], "current").map((item) => item.id)).toEqual(["available"]);
  });

  test("replaces the @ query with the existing internal-note link format", () => {
    ensureTestWindowDom();
    const editor = new Editor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "@Project" }] }],
      },
    });

    insertSuggestedNoteLink({
      editor,
      item: memo({ id: "target" }),
      labels,
      range: { from: 1, to: 9 },
    });

    expect(editor.getJSON().content[0].content).toEqual([{
      type: "text",
      marks: [{
        type: "link",
        attrs: {
          href: "#memo=target",
          target: "_blank",
          rel: "noopener noreferrer nofollow",
          class: "edgeever-note-link",
          title: null,
        },
      }],
      text: "Project note",
    }]);
    editor.destroy();
  });

  test("uses the untitled fallback for an empty title", () => {
    ensureTestWindowDom();
    const editor = new Editor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "@" }] }],
      },
    });

    insertSuggestedNoteLink({
      editor,
      item: memo({ id: "untitled", title: "" }),
      labels,
      range: { from: 1, to: 2 },
    });

    expect(editor.getText()).toBe("Untitled note");
    editor.destroy();
  });
});
