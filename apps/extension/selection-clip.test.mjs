import { describe, expect, test } from "bun:test";
import { markdownToDoc } from "../../packages/shared/src/content.ts";
import { selectionNoteMarkdown, selectionNoteTitle, selectionTextMarkdown } from "./src/selection-clip.ts";

describe("selection note", () => {
  test("uses the selected passage as the title and keeps the page as a fallback", () => {
    expect(selectionNoteTitle("First sentence.\nThen more", "Article title", "Selected text")).toBe("First sentence. Then more");
    expect(selectionNoteTitle("   ", "Article title", "Selected text")).toBe("Article title");
    expect(selectionNoteTitle("", "", "Selected text")).toBe("Selected text");
    expect(selectionNoteTitle("ア".repeat(100), "", "Selected text")).toHaveLength(80);
  });

  test("saves the passage and a source link without the rest of the page", () => {
    const markdown = selectionNoteMarkdown({
      markdown: "Kept paragraph.\n\n\n\nSecond paragraph.",
      pageUrl: "https://example.com/a(b)",
      capturedAt: "2026-09-27T00:00:00.000Z",
      sourceLabel: "Source",
      capturedAtLabel: "Captured at",
    });
    expect(markdown.startsWith("Kept paragraph.\n\n\n\nSecond paragraph.")).toBe(true);
    expect(markdown).toContain("[https://example.com/a(b)](https://example.com/a%28b%29)");
    expect(markdown).toContain("Captured at: 2026-09-27T00:00:00.000Z");
    expect(markdown).toContain("Kept paragraph.\n\n\n\nSecond paragraph.");
  });
});


test('frozen plain selection fallback preserves literal formatting, indentation, URLs and entities', () => {
  const values = [
    '![literal](https://example.test/a.png)\n\n# Text &copy; <img src=x>\n\n~~strike~~',
    'First\n====\n\n> quoted\n---',
    'Intro\n\n    const value = a * b;\n    if (value < 10) run();',
    '\t<img src=x> *literal*',
    '[title](https://example.test) https://example.test/a?x=1 www.example.test a@example.test',
    '&lt;literal&gt; &#32; $math$ **bold** `code`',
  ];
  for (const value of values) {
    const doc = markdownToDoc(selectionTextMarkdown(value)), nodes = [];
    const visit = (node) => { nodes.push(node); (node.content || []).forEach(visit); };
    visit(doc);
    expect(nodes.every((node) => ['doc', 'paragraph', 'text', 'hardBreak'].includes(node.type))).toBe(true);
    expect(nodes.filter((node) => node.type === 'text').map((node) => node.text).join('').replace(/\n/g, '')).toBe(value.replace(/\n/g, ''));
    expect(nodes.some((node) => node.marks?.length)).toBe(false);
  }
});
