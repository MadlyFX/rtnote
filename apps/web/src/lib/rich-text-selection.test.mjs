import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { markdownToDoc } from "@rtnote/shared";
import { getRichTextSelectionContext, markdownForRichTextSelection } from "@rtnote/shared";

describe("markdownForRichTextSelection", () => {
  test("keeps list-like single-line output inline inside a paragraph", () => {
    expect(markdownForRichTextSelection("1. - Proofread", true)).toEqual([
      { type: "text", text: "1. - Proofread" },
    ]);
  });

  test("does not split the surrounding paragraph when applying the replacement", () => {
    const text = "The entry sits in the note bar, 1. - Proofread previews the result before writing.";
    const selectedText = "1. - Proofread";
    const from = text.indexOf(selectedText) + 1;
    const editor = new Editor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      },
    });

    editor.commands.insertContentAt(
      { from, to: from + selectedText.length },
      markdownForRichTextSelection(selectedText, true),
    );

    expect(editor.getJSON()).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });
    editor.destroy();
  });

  test("keeps a selected list item in its existing list instead of nesting another list", () => {
    const originalMarkdown = [
      "The entry sits in the selection menu and the note bar,",
      "",
      "1. - Proofread",
      "",
      "previewing the result before writing.",
    ].join("\n");
    const editor = new Editor({
      extensions: [StarterKit],
      content: markdownToDoc(originalMarkdown),
    });
    const originalDoc = editor.getJSON();
    let listPosition = null;
    editor.state.doc.descendants((node, pos) => {
      if (listPosition === null && node.type.name === "orderedList") listPosition = pos;
    });
    expect(listPosition).not.toBeNull();

    const context = getRichTextSelectionContext(
      editor.state.doc,
      NodeSelection.create(editor.state.doc, listPosition),
    );
    expect(context).toMatchObject({
      contentMarkdown: "- Proofread",
      isInline: true,
    });

    editor.commands.insertContentAt(
      { from: context.from, to: context.to },
      markdownForRichTextSelection(context.contentMarkdown, context.isInline),
    );

    expect(editor.getJSON()).toEqual(originalDoc);
    editor.destroy();
  });

  test("preserves inline Markdown marks", () => {
    expect(markdownForRichTextSelection("make it **more** natural", true)).toEqual([
      { type: "text", text: "make it " },
      { type: "text", text: "more", marks: [{ type: "bold" }] },
      { type: "text", text: " natural" },
    ]);
  });

  test("collapses multi-block output when replacing an inline selection", () => {
    expect(markdownForRichTextSelection("First paragraph\n\nSecond paragraph", true)).toEqual([
      { type: "text", text: "First paragraph Second paragraph" },
    ]);
  });

  test("keeps block parsing when the original selection spans blocks", () => {
    expect(markdownForRichTextSelection("1. - Proofread", false)[0]?.type).toBe("orderedList");
  });

  test("replaces a table node selected at the start of the document", () => {
    const editor = new Editor({
      extensions: [StarterKit, TableKit],
      content: markdownToDoc([
        "| A | B |",
        "| --- | --- |",
        "| foo | bar |",
      ].join("\n")),
    });
    const context = getRichTextSelectionContext(
      editor.state.doc,
      NodeSelection.create(editor.state.doc, 0),
    );

    expect(context).not.toBeNull();
    const range = { from: context.from, to: context.to };
    expect(range.from).toBe(0);

    editor.commands.insertContentAt(
      range,
      markdownForRichTextSelection([
        "| X | Y |",
        "| --- | --- |",
        "| one | two |",
      ].join("\n"), context.isInline),
    );

    expect(editor.getJSON().content).toHaveLength(1);
    expect(editor.getJSON().content[0]?.type).toBe("table");
    expect(JSON.stringify(editor.getJSON())).toContain("one");
    expect(JSON.stringify(editor.getJSON())).not.toContain("foo");
    editor.destroy();
  });
});
