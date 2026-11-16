import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { ZipWriter, Uint8ArrayWriter, TextReader } from "@zip.js/zip.js/index-native.js";
import { readDocx } from "./docx.ts";
import { rewriteDocxImageSources } from "./docx-resources.ts";
import { NoteImportSession } from "./session.ts";
import { MemoryImportIndex, indexItems } from "./index-store.ts";
import { docToMarkdown, markdownToDoc } from "../content.ts";
import { NOTE_FONT_FAMILIES } from "../text-formatting.ts";

const fixture = async (name) => new Blob([await readFile(new URL(`../../../../tests/fixtures/note-import/docx/${name}`, import.meta.url))]);
const read = async (name) => readDocx(await fixture(name));

/** Walks a TipTap document depth first. */
const nodes = (node, out = []) => {
  out.push(node);
  for (const child of node.content ?? []) nodes(child, out);
  return out;
};
const find = (doc, test) => nodes(doc).find(test);
const textOf = (node) => nodes(node).filter((item) => item.type === "text").map((item) => item.text).join("");
const blockWithText = (doc, text) => find(doc, (node) => node.content?.some?.((child) => child.type === "text") && textOf(node).includes(text));
/** Unmarked neighbours merge into one text node, so a fragment is found inside it. */
const textNode = (doc, text) => find(doc, (node) => node.type === "text" && node.text === text)
  ?? find(doc, (node) => node.type === "text" && node.text.includes(text));
const markOf = (node, type) => node?.marks?.find((mark) => mark.type === type);
const fontValue = (id) => NOTE_FONT_FAMILIES.find((font) => font.id === id).value;

describe("DOCX formatting", () => {
  test("paragraph alignment and line spacing become textAlign and lineHeight", async () => {
    const { doc } = await read("formatting.docx");
    expect(blockWithText(doc, "Centered paragraph").attrs).toEqual({ textAlign: "center" });
    expect(blockWithText(doc, "Right aligned").attrs).toEqual({ textAlign: "right" });
    expect(blockWithText(doc, "Justified paragraph").attrs).toEqual({ textAlign: "justify", lineHeight: "2" });
    expect(blockWithText(doc, "One and a half").attrs).toEqual({ lineHeight: "1.5" });
    // Exact line spacing has no unitless equivalent, and the document default (1.08) is the note default.
    expect(blockWithText(doc, "Exact spacing").attrs).toBeUndefined();
    expect(blockWithText(doc, "Left body text").attrs).toBeUndefined();
  });

  test("headings come from built-in styles and keep RTNote's heading look", async () => {
    const { doc } = await read("formatting.docx");
    expect(blockWithText(doc, "Quarterly report")).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(blockWithText(doc, "Overview")).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(blockWithText(doc, "Lists")).toMatchObject({ type: "heading", attrs: { level: 2 } });
    // The heading style's blue colour, theme font and size are not stamped on the text.
    expect(textNode(doc, "Overview").marks).toBeUndefined();
  });

  test("bold, italic, underline and strike, including style and toggle forms", async () => {
    const { doc } = await read("formatting.docx");
    expect(textNode(doc, "Bold").marks).toEqual([{ type: "bold" }]);
    expect(textNode(doc, "italic").marks).toEqual([{ type: "italic" }]);
    expect(textNode(doc, "underline").marks).toEqual([{ type: "underline" }]);
    expect(textNode(doc, "strike").marks).toEqual([{ type: "strike" }]);
    expect(textNode(doc, "double strike").marks).toEqual([{ type: "strike" }]);
    expect(textNode(doc, "strong style").marks).toEqual([{ type: "bold" }]);
  });

  test("run fonts and sizes become normalized textStyle values; the document default is not stamped", async () => {
    const { doc } = await read("formatting.docx");
    expect(markOf(textNode(doc, "Georgia 14pt"), "textStyle").attrs).toEqual({ fontFamily: fontValue("georgia"), fontSize: "19px" });
    expect(markOf(textNode(doc, "Courier New 9pt"), "textStyle").attrs).toEqual({ fontFamily: fontValue("courier"), fontSize: "12px" });
    // A font outside the picker keeps its name with a generic fallback from the font table.
    expect(markOf(textNode(doc, "Garamond"), "textStyle").attrs).toEqual({ fontFamily: "'Garamond', serif" });
    expect(textNode(doc, "Calibri 11pt is the default").marks).toBeUndefined();
  });

  test("text colour, highlight and run shading become textStyle colours; hidden text is dropped", async () => {
    const { doc } = await read("formatting.docx");
    expect(markOf(textNode(doc, "Red text"), "textStyle").attrs).toEqual({ color: "#c00000" });
    expect(textNode(doc, "auto colour").marks).toBeUndefined();
    expect(markOf(textNode(doc, "yellow highlight"), "textStyle").attrs).toEqual({ backgroundColor: "#ffff00" });
    expect(markOf(textNode(doc, "shaded run"), "textStyle").attrs).toEqual({ backgroundColor: "#e2efd9" });
    expect(JSON.stringify(doc)).not.toContain("hidden text");
  });

  test("hyperlinks keep safe targets only; field links and line breaks are read", async () => {
    const { doc } = await read("formatting.docx");
    expect(textNode(doc, "RTNote").marks).toEqual([{ type: "link", attrs: { href: "https://rtnote.example/" } }]);
    expect(textNode(doc, "this unsafe link").marks).toBeUndefined();
    expect(textNode(doc, "example").marks).toEqual([{ type: "link", attrs: { href: "https://example.com/field" } }]);
    const lines = blockWithText(doc, "Line one");
    expect(lines.content.map((node) => node.type)).toEqual(["text", "hardBreak", "text"]);
  });

  test("lists nest, continue their numbering and honour start overrides", async () => {
    const { doc } = await read("formatting.docx");
    const bullets = doc.content.find((node) => node.type === "bulletList");
    expect(bullets.content.map(textOf)).toEqual(["First bulletNested bullet", "Second bullet"]);
    expect(bullets.content[0].content[1].type).toBe("bulletList");
    const ordered = doc.content.filter((node) => node.type === "orderedList");
    expect(ordered.map((list) => list.attrs.start)).toEqual([1, 3, 4]);
    expect(ordered[0].content[0].content[1]).toMatchObject({ type: "orderedList", attrs: { start: 1 } });
    expect(textOf(ordered[1])).toBe("Step three continues");
  });

  test("quotes, tracked changes and skipped content", async () => {
    const { doc, skipped, createdAt, updatedAt } = await read("formatting.docx");
    expect(find(doc, (node) => node.type === "blockquote" && textOf(node) === "A quoted line.")).toBeDefined();
    expect(textOf(blockWithText(doc, "Kept"))).toBe("Kept text");
    expect(blockWithText(doc, "Inserted paragraph")).toBeDefined();
    expect(skipped).toEqual(["footnote"]);
    expect({ createdAt, updatedAt }).toEqual({ createdAt: "2025-03-04T05:06:07.000Z", updatedAt: "2025-04-05T06:07:08.000Z" });
  });
});

describe("DOCX tables", () => {
  test("merged cells become colspan and rowspan, shading and borders become cell colours", async () => {
    const { doc } = await read("table.docx");
    const [table] = doc.content.filter((node) => node.type === "table");
    const [header, second, third] = table.content;
    expect(header.content.map((cell) => [cell.type, textOf(cell), cell.attrs.colspan, cell.attrs.backgroundColor])).toEqual([
      ["tableHeader", "Merged title", 2, "#fce9e7"],
      ["tableHeader", "Q3", 1, null],
    ]);
    expect(header.content[0].attrs.colwidth).toEqual([160, 160]);
    expect(second.content[0].attrs).toMatchObject({ rowspan: 2, backgroundColor: "#deeaf6" });
    expect(second.content[1].attrs.borderColor).toBe("#c00000");
    // Table Grid's black borders are RTNote's default grid.
    expect(second.content[2].attrs.borderColor).toBeNull();
    // The vertically merged continuation cell is not repeated.
    expect(third.content.map(textOf)).toEqual(["No border", "14"]);
    expect(third.content[0].attrs.borderColor).toBe("none");
  });

  test("table styles give header rows, header columns, their shading and text colour", async () => {
    const { doc } = await read("table.docx");
    const styled = doc.content.filter((node) => node.type === "table")[1];
    expect(styled.content.map((row) => row.content.map((cell) => cell.type))).toEqual([
      ["tableHeader", "tableHeader"],
      ["tableHeader", "tableCell"],
    ]);
    expect(styled.content[0].content[0].attrs).toMatchObject({ backgroundColor: "#4472c4", borderColor: "#8eaadb" });
    expect(markOf(textNode(styled, "Name"), "textStyle").attrs).toEqual({ color: "#ffffff" });
  });

  test("a table without borders anywhere stays borderless", async () => {
    const { doc } = await read("table.docx");
    const borderless = doc.content.filter((node) => node.type === "table")[2];
    expect(borderless.content[0].content.map((cell) => cell.attrs.borderColor)).toEqual(["none", "none"]);
  });
});

describe("DOCX images", () => {
  test("captioned images become imageFigure; widths come from the extent; parts are listed once", async () => {
    const { doc, images, skipped } = await read("image-caption.docx");
    const figure = find(doc, (node) => node.type === "imageFigure");
    expect(figure.content.map((node) => node.type)).toEqual(["image", "imageCaption"]);
    expect(figure.content[0].attrs).toEqual({ src: "docx-resource:word/media/image1.png", alt: "Blue gradient", width: 50, alignment: "center" });
    // The SEQ field result is kept and the instruction is not.
    expect(textOf(figure.content[1])).toBe("Figure 1: Revenue by region");
    const plain = doc.content.filter((node) => node.type === "image");
    expect(plain.map((node) => [node.attrs.alt, node.attrs.width])).toEqual([["Wide banner", 100], ["Inline repeat", 25]]);
    expect(images).toEqual([
      { part: "word/media/image1.png", filename: "image1.png", mimeType: "image/png", byteSize: expect.any(Number) },
      { part: "word/media/image2.png", filename: "image2.png", mimeType: "image/png", byteSize: expect.any(Number) },
    ]);
    expect(skipped.sort()).toEqual(["embeddedObject", "textBox", "unsupportedImage"]);
  });

  test("an image inside a text paragraph splits it around the image", async () => {
    const { doc } = await read("image-caption.docx");
    const index = doc.content.findIndex((node) => node.type === "image" && node.attrs.alt === "Inline repeat");
    expect(textOf(doc.content[index - 1])).toBe("Text before");
    expect(textOf(doc.content[index + 1])).toBe("text after");
    // Text boxes are reported rather than duplicated from their fallback markup.
    expect(JSON.stringify(doc)).not.toContain("Text box text");
  });

  test("uploaded URLs replace the placeholders, and images without an upload are dropped", async () => {
    const { doc } = await read("image-caption.docx");
    const resources = [{ key: "a#word/media/image1.png", docxPart: "word/media/image1.png" }, { key: "a#word/media/image2.png", docxPart: "word/media/image2.png" }];
    const rewritten = rewriteDocxImageSources(doc, resources, { "a#word/media/image1.png": "/api/v1/resources/one" });
    const sources = nodes(rewritten).filter((node) => node.type === "image").map((node) => node.attrs.src);
    expect(sources).toEqual(["/api/v1/resources/one", "/api/v1/resources/one"]);
    expect(JSON.stringify(rewritten)).not.toContain("docx-resource:");
  });
});

describe("DOCX Markdown export", () => {
  test("docToMarkdown keeps the imported formatting in its portable HTML forms", async () => {
    const { doc, images } = await read("sample.docx");
    // As in the import: image placeholders are replaced by uploaded resource URLs before the commit.
    const resources = images.map((image) => ({ key: image.part, docxPart: image.part }));
    const markdown = docToMarkdown(rewriteDocxImageSources(doc, resources, { "word/media/image1.png": "/api/v1/resources/res_1/image1.png" }));
    expect(markdown).toContain("# Project brief");
    expect(markdown).toContain('<div align="center">\n\nPrepared for the steering group');
    expect(markdown).toContain('<div align="justify" style="line-height: 1.5">');
    expect(markdown).toContain(`<span style="font-family: ${fontValue("georgia")}; font-size: 19px">Georgia 14pt</span>`);
    expect(markdown).toContain('<span style="color: #c00000">red text</span>');
    expect(markdown).toContain('<span style="background-color: #ffff00">highlight</span>');
    expect(markdown).toContain('<th colspan="2" colwidth="160,160" style="background-color: #fce9e7">');
    expect(markdown).toContain('<td rowspan="2" colwidth="160" style="background-color: #deeaf6">');
    expect(markdown).toContain('<td colwidth="160" style="border-color: #c00000">');
    expect(markdown).toContain("<figcaption>Figure 1: Revenue by region</figcaption>");
    expect(markdown).toContain("- Review the budget\n- Approve the plan");
    // The Markdown reads back to the same structure, so derived Markdown stays faithful.
    const reread = markdownToDoc(markdown);
    expect(find(reread, (node) => node.type === "imageFigure")).toBeDefined();
    expect(find(reread, (node) => node.type === "tableHeader" && node.attrs?.colspan === 2)?.attrs.backgroundColor).toBe("#fce9e7");
    expect(find(reread, (node) => node.type === "tableCell" && node.attrs?.rowspan === 2)).toBeDefined();
  });
});

describe("DOCX preflight", () => {
  const emptyPackage = async () => {
    const writer = new ZipWriter(new Uint8ArrayWriter());
    await writer.add("hello.txt", new TextReader("not a document"));
    return writer.close();
  };

  test("scans documents into notes with their images, and reports what cannot be imported", async () => {
    const files = [
      { path: "Reports/sample.docx", file: new File([await fixture("sample.docx")], "sample.docx") },
      { path: "Reports/image-caption.docx", file: new File([await fixture("image-caption.docx")], "image-caption.docx") },
      { path: "Reports/~$sample.docx", file: new File(["lock"], "~$sample.docx") },
      { path: "Reports/legacy.doc", file: new File(["binary"], "legacy.doc") },
      { path: "Reports/broken.docx", file: new File([await emptyPackage()], "broken.docx") },
      { path: "Reports/notes.txt", file: new File(["text"], "notes.txt") },
    ];
    const session = new NoteImportSession("docx", files, new MemoryImportIndex());
    try {
      const summary = await session.scan();
      expect(summary).toMatchObject({ format: "docx", notes: 2, notebooks: 1, resources: 3 });
      const notes = [];
      for await (const note of indexItems(session.index, "note")) notes.push(note);
      expect(notes.map((note) => [note.title, note.notebookKey, note.createdAt])).toEqual([
        ["image-caption", "Reports", "2025-03-04T05:06:07.000Z"],
        ["sample", "Reports", "2025-03-04T05:06:07.000Z"],
      ]);
      const issues = [];
      for await (const issue of indexItems(session.index, "issue")) issues.push([issue.code, issue.path, issue.severity]);
      expect(issues.sort()).toEqual([
        ["docFormat", "Reports/legacy.doc", "error"],
        ["docxSkippedContent", "Reports/image-caption.docx", "warning"],
        ["invalidDocx", "Reports/broken.docx", "error"],
        ["unusedResource", "Reports/notes.txt", "warning"],
      ]);

      const document = await session.readNote(notes[1].key);
      expect(document.contentMarkdown).toBe("");
      expect(find(document.contentJson, (node) => node.type === "imageFigure")).toBeDefined();
      const [resource] = notes[1].resources;
      expect(resource).toMatchObject({ docxPart: "word/media/image1.png", mimeType: "image/png" });
      const bytes = await session.readResourcePart(resource, 0, resource.byteSize);
      expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    } finally {
      await session.close();
    }
  });

  test("documents inside a ZIP archive are read from the archive", async () => {
    const writer = new ZipWriter(new Uint8ArrayWriter());
    const { Uint8ArrayReader } = await import("@zip.js/zip.js/index-native.js");
    await writer.add("Word export/table.docx", new Uint8ArrayReader(new Uint8Array(await (await fixture("table.docx")).arrayBuffer())));
    const session = new NoteImportSession("docx", [{ path: "export.zip", file: new File([await writer.close()], "export.zip") }], new MemoryImportIndex());
    try {
      expect(await session.scan()).toMatchObject({ notes: 1, errors: 0 });
      const [note] = await session.index.page("note");
      expect(note.notebookKey).toBe("Word export");
      const document = await session.readNote(note.key);
      expect(find(document.contentJson, (node) => node.type === "tableCell" && node.attrs.rowspan === 2)).toBeDefined();
    } finally {
      await session.close();
    }
  });
});
