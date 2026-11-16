import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { markdownToDoc } from "@edgeever/shared";
import { getRichTextSelectionContext, markdownForRichTextSelection } from "@edgeever/shared";

describe("markdownForRichTextSelection", () => {
  test("keeps list-like single-line output inline inside a paragraph", () => {
    expect(markdownForRichTextSelection("1. - 校对", true)).toEqual([
      { type: "text", text: "1. - 校对" },
    ]);
  });

  test("does not split the surrounding paragraph when applying the replacement", () => {
    const text = "入口放在笔记栏中，1. - 校对先预览结果，再进行写入。";
    const selectedText = "1. - 校对";
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
      "入口放在选中文本菜单和笔记栏中，",
      "",
      "1. - 校对",
      "",
      "先预览结果，再进行写入。",
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
      contentMarkdown: "- 校对",
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
    expect(markdownForRichTextSelection("改得 **自然** 一些", true)).toEqual([
      { type: "text", text: "改得 " },
      { type: "text", text: "自然", marks: [{ type: "bold" }] },
      { type: "text", text: " 一些" },
    ]);
  });

  test("collapses multi-block output when replacing an inline selection", () => {
    expect(markdownForRichTextSelection("第一段\n\n第二段", true)).toEqual([
      { type: "text", text: "第一段 第二段" },
    ]);
  });

  test("keeps block parsing when the original selection spans blocks", () => {
    expect(markdownForRichTextSelection("1. - 校对", false)[0]?.type).toBe("orderedList");
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
