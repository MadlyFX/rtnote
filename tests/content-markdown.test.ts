import { describe, expect, test } from "bun:test";
import { docToMarkdown, markdownToDoc } from "@rtnote/shared";
import { NEW_IMAGE_WIDTH_PERCENT } from "@rtnote/shared/image-display";

describe("shared Markdown conversion", () => {
  test("parses adjacent headings, lists, quotes, and inline formatting into TipTap nodes", () => {
    const doc = markdownToDoc(`## 1. Organization Info
* **Legal name**：Example Network Technology Co., Ltd.
* **English name**：Example Co., Ltd.
## 2. Domain & Contact
* **Official website**：[RTNote](https://www.rtnote.example)
> [!WARNING]
> Do not link other accounts.`);

    expect(doc.content.map((node) => node.type)).toEqual([
      "heading",
      "bulletList",
      "heading",
      "bulletList",
      "blockquote",
    ]);

    const firstList = doc.content[1];
    const firstText = firstList.content?.[0]?.content?.[0]?.content?.[0];
    expect(firstText).toEqual({
      type: "text",
      text: "Legal name",
      marks: [{ type: "bold" }],
    });

    const secondList = doc.content[3];
    const linkText = secondList.content?.[0]?.content?.[0]?.content?.[2];
    expect(linkText).toMatchObject({
      type: "text",
      text: "RTNote",
      marks: [{ type: "link", attrs: { href: "https://www.rtnote.example" } }],
    });
  });

  test("preserves heading levels 1 through 6", () => {
    const markdown = `# H1

## H2

### H3

#### H4

##### H5

###### H6`;

    const doc = markdownToDoc(markdown);
    expect(doc.content.map((node) => [node.type, node.attrs?.level])).toEqual([
      ["heading", 1],
      ["heading", 2],
      ["heading", 3],
      ["heading", 4],
      ["heading", 5],
      ["heading", 6],
    ]);
    expect(docToMarkdown(doc)).toBe(markdown);
  });

  test("serializes TipTap marks and block nodes back to Markdown", () => {
    const markdown = `# Title

- **Bold** and *italic*
- [Link](https://example.com)

> Quote

\`code\` and ~~deleted~~`;

    expect(docToMarkdown(markdownToDoc(markdown))).toBe(markdown);
  });

  test("preserves fenced code blocks and standalone images", () => {
    const markdown = `\`\`\`ts
const answer = 42;
\`\`\`

![Example](/api/v1/resources/res_1/blob "Title")`;

    const doc = markdownToDoc(markdown);
    expect(doc.content.map((node) => node.type)).toEqual(["codeBlock", "image"]);
    expect(doc.content[1]?.attrs?.width).toBe(NEW_IMAGE_WIDTH_PERCENT);
    expect(docToMarkdown(doc)).toBe(markdown);
  });

  test("groups consecutive images into one gallery and keeps a single image alone", () => {
    const markdown = "Body\n\n![One](/a.png)\n\n![Two](/b.png)\n\n![Three](/c.png)\n\nSource";
    const doc = markdownToDoc(markdown);
    expect(doc.content.map((node) => node.type)).toEqual(["paragraph", "rtnoteImageGallery", "paragraph"]);
    expect(doc.content[1]?.attrs).toEqual({ layout: "auto" });
    expect(doc.content[1]?.content?.map((node) => node.attrs?.src)).toEqual(["/a.png", "/b.png", "/c.png"]);
    expect(docToMarkdown(doc)).toBe(markdown);
  });

  test("parses and serializes inline and block LaTeX", () => {
    const markdown = `Euler: $e^{i\\pi}+1=0$.

$$
\\frac{a}{b}
$$`;

    const doc = markdownToDoc(markdown);
    expect(doc.content[0]?.content?.[1]).toMatchObject({
      type: "inlineMath",
      attrs: { latex: "e^{i\\pi}+1=0" },
    });
    expect(doc.content[1]).toMatchObject({
      type: "blockMath",
      attrs: { latex: "\\frac{a}{b}" },
    });
    expect(docToMarkdown(doc)).toBe(markdown);
  });
});
