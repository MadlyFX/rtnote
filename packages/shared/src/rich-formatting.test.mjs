import { describe, expect, test } from "bun:test";
import { Editor } from "@tiptap/core";
import { EditorState, NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { DOMParser, DOMSerializer } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { parseHTML } from "linkedom";
import {
  createRTNoteDocumentExtensions,
  docToMarkdown,
  docToText,
  markdownToDoc,
  mergeMarkdownIntoDoc,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeLineHeight,
  normalizeTextAlignment,
  prepareNativeEditorContent,
  restoreNativeEditorContent,
  tableNeedsHtml,
} from "./index.ts";
import { createRTNoteMarkdownMathematics } from "./mathematics-markdown.ts";
import { splitMarkdownParseChunks } from "./markdown-block-start.ts";

const text = (value, marks) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (value, attrs) => ({ type: "paragraph", ...(attrs ? { attrs } : {}), content: value ? [text(value)] : [] });
const doc = (...content) => ({ type: "doc", content });
const image = (attrs = {}) => ({ type: "image", attrs: { src: "rtnote-resource://res_1", alt: "Diagram", width: 50, ...attrs } });
const figure = (caption, attrs) => ({
  type: "imageFigure",
  content: [image(attrs), { type: "imageCaption", ...(caption ? { content: [text(caption)] } : {}) }],
});
const cell = (type, value, attrs) => ({ type, ...(attrs ? { attrs } : {}), content: [paragraph(value)] });

/** Drops default-null attributes so parsed and authored JSON compare by meaning. */
const meaningful = (node) => {
  if (!node || typeof node !== "object") return node;
  const { attrs, content, marks, ...rest } = node;
  const kept = attrs && Object.fromEntries(Object.entries(attrs).filter(([, value]) => value !== null && value !== undefined && value !== ""));
  return {
    ...rest,
    ...(kept && Object.keys(kept).length ? { attrs: kept } : {}),
    ...(marks ? { marks: marks.map(meaningful) } : {}),
    ...(content ? { content: content.map(meaningful) } : {}),
  };
};

/** Serializes a node's toDOM spec to an HTML-like string without a DOM. */
const renderSpec = (spec) => {
  if (typeof spec === "string") return spec;
  if (!Array.isArray(spec)) return "";
  const [tag, maybeAttrs, ...rest] = spec;
  const attrs = maybeAttrs && typeof maybeAttrs === "object" && !Array.isArray(maybeAttrs) ? maybeAttrs : {};
  const children = attrs === maybeAttrs ? rest : [maybeAttrs, ...rest];
  const attributes = Object.entries(attrs).filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ` ${key}="${value}"`).join("");
  return `<${tag}${attributes}>${children.map((child) => (child === 0 ? "…" : renderSpec(child))).join("")}</${tag}>`;
};
const renderNodes = (editor) => {
  const pieces = [];
  editor.state.doc.descendants((node) => {
    if (node.type.spec.toDOM && !node.isText) pieces.push(renderSpec(node.type.spec.toDOM(node)));
    for (const mark of node.marks) pieces.push(renderSpec(mark.type.spec.toDOM(mark, true)));
  });
  return pieces.join("\n");
};

/**
 * Headless editors only install plugins when mounted in a DOM. Apply a
 * transaction to a state that has them, as a mounted editor would.
 */
const applyWithPlugins = (editor, build) => {
  const state = EditorState.create({ schema: editor.schema, doc: editor.state.doc, plugins: editor.extensionManager.plugins });
  return state.apply(build(state.tr)).doc;
};

const createEditor = (content) => {
  const editor = new Editor({
    extensions: createRTNoteDocumentExtensions({ mathematics: createRTNoteMarkdownMathematics() }),
    content,
  });
  // Headless editors report isDestroyed without a mounted view; commands still work.
  Object.defineProperty(editor, "isDestroyed", { value: false, configurable: true });
  return editor;
};

describe("formatting value normalizers", () => {
  test("accept safe font stacks and reject CSS injection", () => {
    expect(normalizeFontFamily('Georgia, "Times New Roman", serif')).toBe("Georgia, 'Times New Roman', serif");
    expect(normalizeFontFamily("Noto Sans SC")).toBe("Noto Sans SC");
    expect(normalizeFontFamily("Arial; color: red")).toBeNull();
    expect(normalizeFontFamily("url(https://example.com/x)")).toBeNull();
    expect(normalizeFontFamily("'unterminated, serif")).toBeNull();
    expect(normalizeFontFamily("")).toBeNull();
  });

  test("keep sizes, alignments and line heights within their ranges", () => {
    expect(normalizeFontSize("18px")).toBe("18px");
    expect(normalizeFontSize("12pt")).toBe("16px");
    expect(normalizeFontSize("4px")).toBeNull();
    expect(normalizeFontSize("200px")).toBeNull();
    expect(normalizeFontSize("1.5em")).toBeNull();
    expect(normalizeTextAlignment("CENTER")).toBe("center");
    expect(normalizeTextAlignment("start")).toBe("left");
    expect(normalizeTextAlignment("middle")).toBeNull();
    expect(normalizeLineHeight("1.5")).toBe("1.5");
    expect(normalizeLineHeight("10")).toBeNull();
    expect(normalizeLineHeight("2px")).toBeNull();
  });
});

describe("fonts, alignment and line spacing", () => {
  const formatted = doc(
    { type: "paragraph", attrs: { textAlign: "center", lineHeight: "1.5" }, content: [
      text("Hello "),
      text("world", [{ type: "bold" }, { type: "textStyle", attrs: { fontFamily: "Georgia, serif", fontSize: "24px", color: "#c94343" } }]),
    ] },
    { type: "heading", attrs: { level: 2, textAlign: "right" }, content: [text("Title")] },
    { type: "blockquote", content: [paragraph("Quoted", { textAlign: "justify" })] },
    paragraph("Plain"),
  );

  test("export as HTML that other Markdown renderers understand", () => {
    const markdown = docToMarkdown(formatted);
    expect(markdown).toContain('<div align="center" style="line-height: 1.5">\n\nHello <span style="color: #c94343; font-family: Georgia, serif; font-size: 24px">**world**</span>\n\n</div>');
    expect(markdown).toContain('<div align="right">\n\n## Title\n\n</div>');
    expect(markdown).toContain("> <div align=\"justify\">");
    expect(markdown).toMatch(/\n\nPlain$/);
  });

  test("round-trip through RTNote's Markdown parser", () => {
    expect(meaningful(markdownToDoc(docToMarkdown(formatted)))).toEqual(meaningful(formatted));
  });

  test("leave list items unwrapped, because blank lines would end the item", () => {
    const list = doc({ type: "bulletList", content: [{ type: "listItem", content: [paragraph("Item", { textAlign: "center" })] }] });
    expect(docToMarkdown(list)).toBe("- Item");
  });

  test("ignore foreign <div> markup that is not RTNote's wrapper", () => {
    const parsed = markdownToDoc('<div style="color: red">\n\nText\n\n</div>');
    expect(JSON.stringify(parsed)).not.toContain("textAlign");
  });

  test("commands set and clear the attributes", () => {
    const editor = createEditor(doc(paragraph("Alpha")));
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(editor.commands.setTextAlign("center")).toBe(true);
    expect(editor.commands.setLineHeight("2")).toBe(true);
    expect(editor.commands.setFontFamily("Georgia, serif")).toBe(true);
    expect(editor.commands.setFontSize("20px")).toBe(true);
    expect(editor.commands.setFontFamily("x; y")).toBe(false);
    let json = editor.getJSON();
    expect(json.content[0].attrs).toEqual({ textAlign: "center", lineHeight: "2" });
    expect(json.content[0].content[0].marks[0].attrs).toMatchObject({ fontFamily: "Georgia, serif", fontSize: "20px" });

    editor.commands.setTextAlign("left");
    editor.commands.setFontSize("16px");
    editor.commands.unsetFontFamily();
    editor.commands.unsetLineHeight();
    json = editor.getJSON();
    expect(json.content[0].attrs).toEqual({ textAlign: null, lineHeight: null });
    expect(json.content[0].content[0].marks).toBeUndefined();
    editor.destroy();
  });

  test("render inline styles for share pages and print", () => {
    const editor = createEditor(formatted);
    const html = renderNodes(editor);
    expect(html).toContain('style="text-align: center; line-height: 1.5"');
    expect(html).toContain("font-family: Georgia, serif");
    expect(html).toContain("font-size: 24px");
    editor.destroy();
  });
});

describe("tables", () => {
  const simple = {
    type: "table",
    content: [
      { type: "tableRow", content: [cell("tableHeader", "A"), cell("tableHeader", "B")] },
      { type: "tableRow", content: [cell("tableCell", "1"), cell("tableCell", "2")] },
    ],
  };
  const rich = {
    type: "table",
    content: [
      { type: "tableRow", content: [cell("tableHeader", "Title", { colspan: 2, backgroundColor: "#fce9e7", colwidth: [120, 80] })] },
      { type: "tableRow", attrs: { rowheight: 40 }, content: [
        cell("tableHeader", "Side"),
        { type: "tableCell", attrs: { borderColor: "none" }, content: [
          paragraph("One"),
          { type: "bulletList", content: [{ type: "listItem", content: [paragraph("Two")] }] },
        ] },
      ] },
      { type: "tableRow", content: [
        { type: "tableCell", attrs: { rowspan: 1 }, content: [paragraph("")] },
        cell("tableCell", "Three", { borderColor: "#337ea9" }),
      ] },
    ],
  };

  test("plain tables stay GFM", () => {
    expect(tableNeedsHtml(simple)).toBe(false);
    expect(docToMarkdown(doc(simple))).toContain("| A   | B   |");
  });

  test("merged cells, colours, borders, block content and header columns switch to HTML", () => {
    expect(tableNeedsHtml(rich)).toBe(true);
    const noHeader = { ...simple, content: simple.content.map((row) => ({ ...row, content: row.content.map((item) => ({ ...item, type: "tableCell" })) })) };
    expect(tableNeedsHtml(noHeader)).toBe(true);
    const markdown = docToMarkdown(doc(rich));
    expect(markdown).toContain('<th colspan="2" colwidth="120,80" style="background-color: #fce9e7">');
    expect(markdown).toContain('<tr style="height: 40px">');
    expect(markdown).toContain('<td style="border-color: transparent">\n\nOne\n\n- Two\n\n</td>');
    expect(markdown).toContain("<td></td>");
  });

  test("HTML tables round-trip, including on the Worker parser", () => {
    expect(meaningful(markdownToDoc(docToMarkdown(doc(rich))))).toEqual(meaningful(doc({
      ...rich,
      content: rich.content.map((row, index) => index === 2
        ? { ...row, content: [{ type: "tableCell", content: [{ type: "paragraph" }] }, row.content[1]] }
        : row),
    })));
  });

  test("malformed HTML tables fall back instead of throwing", () => {
    expect(() => markdownToDoc("<table>\n<tr>\n<td>\n\nopen")).not.toThrow();
  });

  test("cell colour and border render with palette names for dark mode", () => {
    const editor = createEditor(doc(rich));
    const html = renderNodes(editor);
    expect(html).toContain('data-ee-background-color="red"');
    expect(html).toContain('data-ee-border-color="none"');
    expect(html).toContain('data-ee-border-color="blue"');
    expect(html).toContain("border-color: #337ea9");
    editor.destroy();
  });

  test("merge, split and header column commands work on the shared schema", () => {
    const editor = createEditor(doc(simple));
    const cells = [];
    editor.state.doc.descendants((node, pos) => { if (["cell", "header_cell"].includes(node.type.spec.tableRole)) cells.push(pos); });
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, cells[2], cells[3])));
    expect(editor.commands.mergeCells()).toBe(true);
    expect(editor.getJSON().content[0].content[1].content[0].attrs.colspan).toBe(2);
    expect(editor.commands.splitCell()).toBe(true);
    expect(editor.getJSON().content[0].content[1].content).toHaveLength(2);
    expect(editor.commands.toggleHeaderColumn()).toBe(true);
    expect(tableNeedsHtml(editor.getJSON().content[0])).toBe(true);
    editor.destroy();
  });
});

describe("image captions", () => {
  test("export as <figure> and parse back", () => {
    const source = doc(figure("A sleepy cat", { alignment: "center" }), figure("Plain"), paragraph("End"));
    const markdown = docToMarkdown(source);
    expect(markdown).toContain('<figure>\n<img src="rtnote-resource://res_1" alt="Diagram" data-image-align="center"');
    expect(markdown).toContain("<figcaption>A sleepy cat</figcaption>\n</figure>");
    // An image without explicit alignment does not gain one.
    expect(markdown).toContain('<img src="rtnote-resource://res_1" alt="Diagram" width="50%" />\n<figcaption>Plain</figcaption>');
    expect(meaningful(markdownToDoc(markdown))).toEqual(meaningful(source));
  });

  test("keep caption formatting", () => {
    const source = doc({ type: "imageFigure", content: [image(), { type: "imageCaption", content: [text("A "), text("bold", [{ type: "bold" }]), text(" caption")] }] });
    const back = markdownToDoc(docToMarkdown(source));
    expect(back.content[0].content[1].content[1]).toEqual(text("bold", [{ type: "bold" }]));
  });

  test("an empty caption exports as a plain image", () => {
    expect(docToMarkdown(doc(figure("")))).toBe("![Diagram](rtnote-resource://res_1)");
  });

  test("captions are part of search text", () => {
    expect(docToText(doc(figure("Quarterly revenue chart")))).toContain("Quarterly revenue chart");
  });

  test("Markdown merges keep captioned images whose Markdown did not change", () => {
    const current = doc(figure("Caption", { alignment: "right" }), paragraph("Old"));
    const merged = mergeMarkdownIntoDoc(current, docToMarkdown(doc(figure("Caption", { alignment: "right" }), paragraph("New"))));
    expect(merged.content[0]).toBe(current.content[0]);
    expect(merged.content[1].content[0].text).toBe("New");
  });

  test("native editors keep figures instead of turning them into placeholders", () => {
    const source = doc(figure("Kept"));
    const prepared = prepareNativeEditorContent(source, "en-US");
    expect(prepared.content[0].type).toBe("imageFigure");
    expect(restoreNativeEditorContent(prepared)).toEqual(source);
  });

  test("add and remove caption commands", () => {
    const editor = createEditor(doc(paragraph("Before"), image(), paragraph("After")));
    const imagePos = editor.state.doc.child(0).nodeSize;
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, imagePos)));
    expect(editor.commands.addImageCaption()).toBe(true);
    expect(editor.state.doc.child(1).type.name).toBe("imageFigure");
    expect(editor.state.selection.$from.parent.type.name).toBe("imageCaption");
    editor.view.dispatch(editor.state.tr.insertText("Caption"));
    expect(editor.state.doc.child(1).textContent).toBe("Caption");

    expect(editor.commands.removeImageCaption(imagePos + 1)).toBe(true);
    expect(editor.state.doc.child(1).type.name).toBe("image");
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    editor.destroy();
  });

  test("normalizer unwraps a figure that lost its image or caption", () => {
    const editor = createEditor(doc(figure("Orphan caption"), paragraph("After")));
    // Delete the image: the caption becomes an ordinary paragraph.
    const imageSize = editor.state.doc.child(0).child(0).nodeSize;
    let next = applyWithPlugins(editor, (tr) => tr.delete(1, 1 + imageSize));
    expect(next.child(0).type.name).toBe("paragraph");
    expect(next.child(0).textContent).toBe("Orphan caption");

    editor.commands.setContent(doc(figure("Gone")));
    const figureNode = editor.state.doc.child(0);
    const captionPos = 1 + figureNode.child(0).nodeSize;
    // Delete the caption: the image stays as a plain image.
    next = applyWithPlugins(editor, (tr) => tr.delete(captionPos, captionPos + figureNode.child(1).nodeSize));
    expect(next.child(0).type.name).toBe("image");
    editor.destroy();
  });
});

describe("HTML (clipboard and print)", () => {
  test("figures, rich tables, fonts and alignment survive serialize and parse", () => {
    const schema = getSchema(createRTNoteDocumentExtensions({ mathematics: createRTNoteMarkdownMathematics() }));
    const source = doc(
      { type: "paragraph", attrs: { textAlign: "right", lineHeight: "2" }, content: [text("Styled", [{ type: "textStyle", attrs: { fontFamily: "'Courier New', monospace", fontSize: "20px" } }])] },
      figure("Caption", { alignment: "center" }),
      { type: "table", content: [
        { type: "tableRow", content: [cell("tableHeader", "H", { colspan: 2, backgroundColor: "#edf3ec" })] },
        { type: "tableRow", content: [cell("tableHeader", "Side"), cell("tableCell", "Body", { borderColor: "#c94343" })] },
      ] },
    );
    const node = schema.nodeFromJSON(source);
    const { document } = parseHTML("<html><body></body></html>");
    document.body.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(node.content, { document }));
    const html = document.body.innerHTML;
    expect(html).toMatch(/<figure (?=[^>]*data-type="image-figure")(?=[^>]*data-image-align="center")[^>]*>/);
    expect(html).toContain('<figcaption data-type="image-caption">Caption</figcaption>');
    const restored = DOMParser.fromSchema(schema).parse(document.body).toJSON();
    expect(meaningful(restored.content[0])).toEqual(meaningful(source.content[0]));
    expect(restored.content[1].type).toBe("imageFigure");
    expect(restored.content[1].content[1].content[0].text).toBe("Caption");
    expect(restored.content[2].content[0].content[0].attrs).toMatchObject({ colspan: 2, backgroundColor: "#edf3ec" });
    expect(restored.content[2].content[1].content[1].attrs).toMatchObject({ borderColor: "#c94343" });
  });
});

describe("long notes", () => {
  test("HTML containers stay in one parse chunk", () => {
    const filler = "Paragraph text that fills the note.\n\n".repeat(200);
    const table = "<table>\n<tr>\n<td>\n\nCell one\n\nCell two\n\n</td>\n</tr>\n</table>";
    const chunks = splitMarkdownParseChunks(`${filler}${table}\n\n${filler}`);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((chunk) => chunk.includes(table))).toBe(true);
  });
});
