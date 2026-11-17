import { describe, expect, test } from "bun:test";
import { collectMemoLinkIds, createMemoLinkHref, parseMemoLinkHref } from "./note-links.ts";
import { docToMarkdown, markdownToDoc } from "./content.ts";

describe("stable memo links", () => {
  test("round trips a memo id through the internal link format", () => {
    const href = createMemoLinkHref("memo/café 1");

    expect(href).toBe("#memo=memo%2Fcaf%C3%A9%201");
    expect(parseMemoLinkHref(href)).toBe("memo/café 1");
  });

  test("rejects unrelated links", () => {
    expect(parseMemoLinkHref("https://example.com")).toBeNull();
    expect(parseMemoLinkHref("#memo=")).toBeNull();
  });

  test("reads memo ids from resolved hash URLs", () => {
    expect(parseMemoLinkHref("/#memo=memo_flow")).toBe("memo_flow");
    expect(parseMemoLinkHref("http://127.0.0.1:5173/#memo=memo_flow")).toBe("memo_flow");
    expect(parseMemoLinkHref("http://127.0.0.1:5173/#memo=memo%2F%C3%A9")).toBe("memo/é");
  });

  test("restores the memo_ prefix when a model drops it from the hash", () => {
    expect(parseMemoLinkHref("#memo=04833dc5c42d4286800f13be0405f099")).toBe("memo_04833dc5c42d4286800f13be0405f099");
    expect(parseMemoLinkHref("#memo=memo_04833dc5c42d4286800f13be0405f099")).toBe("memo_04833dc5c42d4286800f13be0405f099");
  });

  test("preserves memo links in Markdown", () => {
    const markdown = "See [Project notes](#memo=memo_project).";
    const doc = markdownToDoc(markdown);

    expect(doc.content[0]?.content?.[1]).toMatchObject({
      type: "text",
      text: "Project notes",
      marks: [{ type: "link", attrs: { href: "#memo=memo_project" } }],
    });
    expect(docToMarkdown(doc)).toBe(markdown);
  });

  test("collects unique referenced memo ids from link marks", () => {
    const doc = markdownToDoc("[Project](#memo=memo_project) and [Project copy](#memo=memo_project) and [To-do](#memo=memo_todo)");

    expect(collectMemoLinkIds(doc)).toEqual(["memo_project", "memo_todo"]);
  });
});
