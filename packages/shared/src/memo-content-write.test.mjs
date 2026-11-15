import { describe, expect, test } from "bun:test";
import { docToMarkdown, markdownToDoc, resolveMemoContentDoc } from "./content.ts";
import { mergeMarkdownIntoDoc } from "./markdown-merge.ts";
import { resolveMemoContentWrite } from "./memo-content-write.ts";
import { MEMO_SCHEMA_VERSION_LEGACY, MEMO_SCHEMA_VERSION_RICH_TEXT } from "./memo-schema.ts";
import { serializeTableDocument } from "./table.ts";

const coloredParagraph = {
  type: "paragraph",
  attrs: { textAlign: "center" },
  content: [{ type: "text", text: "Coloured", marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }] }],
};
const sizedImage = { type: "image", attrs: { src: "/api/v1/resources/r1/file", alt: "cat", width: 37 } };
const richDoc = () => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    coloredParagraph,
    { type: "paragraph", content: [{ type: "text", text: "Plain middle" }] },
    sizedImage,
  ],
});

describe("mergeMarkdownIntoDoc", () => {
  test("keeps the JSON of unchanged blocks and parses edited ones", () => {
    const current = richDoc();
    const markdown = docToMarkdown(current).replace("Plain middle", "Edited middle");
    const merged = mergeMarkdownIntoDoc(current, markdown);
    expect(merged.content[1]).toEqual(coloredParagraph);
    expect(merged.content[3]).toEqual(sizedImage);
    expect(JSON.stringify(merged.content[2])).toContain("Edited middle");
  });

  test("handles inserted and deleted blocks", () => {
    const current = richDoc();
    const markdown = `${docToMarkdown(current).replace("Plain middle\n\n", "")}\n\nAppended line`;
    const merged = mergeMarkdownIntoDoc(current, markdown);
    expect(merged.content).toHaveLength(4);
    expect(merged.content[1]).toEqual(coloredParagraph);
    expect(merged.content[2]).toEqual(sizedImage);
    expect(JSON.stringify(merged.content[3])).toContain("Appended line");
  });

  test("falls back to the parsed document when nothing matches", () => {
    const merged = mergeMarkdownIntoDoc(richDoc(), "Something else entirely");
    expect(merged).toEqual(markdownToDoc("Something else entirely"));
  });
});

describe("resolveMemoContentWrite", () => {
  test("JSON writes store schema 2 and regenerate Markdown", () => {
    const result = resolveMemoContentWrite({ contentJson: richDoc(), contentMarkdown: "client copy that is ignored" });
    expect(result.schemaVersion).toBe(MEMO_SCHEMA_VERSION_RICH_TEXT);
    expect(result.contentJson).toEqual(richDoc());
    expect(result.contentMarkdown).toBe(docToMarkdown(richDoc()));
  });

  test("Markdown-only creates keep the Markdown as sent", () => {
    const result = resolveMemoContentWrite({ contentMarkdown: "# Imported\n\nBody" });
    expect(result.schemaVersion).toBe(MEMO_SCHEMA_VERSION_LEGACY);
    expect(result.contentMarkdown).toBe("# Imported\n\nBody");
    expect(result.contentJson).toEqual(markdownToDoc("# Imported\n\nBody"));
  });

  test("empty creates are rich text", () => {
    expect(resolveMemoContentWrite({}).schemaVersion).toBe(MEMO_SCHEMA_VERSION_RICH_TEXT);
  });

  test("Markdown-only updates to rich-text notes merge instead of replace", () => {
    const current = { contentJson: richDoc(), contentMarkdown: docToMarkdown(richDoc()), schemaVersion: 2 };
    const result = resolveMemoContentWrite(
      { contentMarkdown: current.contentMarkdown.replace("Plain middle", "Agent edit") },
      current,
    );
    expect(result.schemaVersion).toBe(MEMO_SCHEMA_VERSION_RICH_TEXT);
    expect(result.contentJson.content[1]).toEqual(coloredParagraph);
    expect(result.contentJson.content[3]).toEqual(sizedImage);
    expect(result.contentMarkdown).toBe(docToMarkdown(result.contentJson));
  });

  test("Markdown-only updates to legacy notes keep the Markdown as sent", () => {
    const current = { contentJson: markdownToDoc("Old"), contentMarkdown: "Old", schemaVersion: 1 };
    const result = resolveMemoContentWrite({ contentMarkdown: "New  text" }, current);
    expect(result.schemaVersion).toBe(MEMO_SCHEMA_VERSION_LEGACY);
    expect(result.contentMarkdown).toBe("New  text");
  });

  test("structured notes keep their Markdown marker", () => {
    const table = serializeTableDocument({
      schemaVersion: 1,
      fields: [{ id: "f1", name: "Name", type: "text" }],
      records: [],
    });
    const fallback = markdownToDoc("Fallback");
    const result = resolveMemoContentWrite({ contentMarkdown: table, contentJson: fallback });
    expect(result.schemaVersion).toBe(MEMO_SCHEMA_VERSION_LEGACY);
    expect(result.contentMarkdown).toBe(table);
    expect(result.contentJson).toEqual(fallback);
  });

  test("updates without content leave the stored state alone", () => {
    const current = { contentJson: richDoc(), contentMarkdown: "x", schemaVersion: 2 };
    expect(resolveMemoContentWrite({}, current)).toBe(current);
  });
});

describe("resolveMemoContentDoc with schema version 2", () => {
  test("opens the JSON even when the Markdown parses to something richer", () => {
    const json = { type: "doc", content: [sizedImage] };
    const markdown = "- [ ] a task only in Markdown";
    expect(resolveMemoContentDoc(json, markdown).content[0].type).toBe("taskList");
    expect(resolveMemoContentDoc(json, markdown, { schemaVersion: 2 }).content[0]).toEqual(sizedImage);
  });

  test("keeps the JSON when the Markdown was generated from it, even without a schema version", () => {
    const json = { type: "doc", content: [sizedImage] };
    expect(resolveMemoContentDoc(json, docToMarkdown(json)).content[0]).toEqual(sizedImage);
  });
});
