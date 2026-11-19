import { expect, mock, test } from "bun:test";
import { docToMarkdown, markdownToDoc } from "@rtnote/shared";

mock.module("@react-native-async-storage/async-storage", () => ({
  default: { getItem: async () => null, removeItem: async () => {}, setItem: async () => {} },
}));

const { restoreDraftDoc } = await import("./mobile-drafts");

const red = {
  type: "paragraph",
  content: [{ type: "text", text: "Red", marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }] }],
};
const memoDoc = { type: "doc", content: [red, { type: "paragraph", content: [{ type: "text", text: "Plain" }] }] };
const memo = { contentJson: memoDoc, contentMarkdown: docToMarkdown(memoDoc), schemaVersion: 2 };

test("restores the draft's rich-text JSON when it has one", () => {
  const draftDoc = { type: "doc", content: [red] };
  expect(restoreDraftDoc({ contentJson: draftDoc, contentMarkdown: "ignored" }, memo)).toEqual(draftDoc);
});

test("merges a Markdown-only draft into the note so untouched paragraphs keep formatting", () => {
  const restored = restoreDraftDoc({ contentMarkdown: memo.contentMarkdown.replace("Plain", "Edited offline") }, memo);
  expect(restored.content[0]).toEqual(red);
  expect(JSON.stringify(restored.content[1])).toContain("Edited offline");
});

test("parses a Markdown-only draft when there is no note", () => {
  expect(restoreDraftDoc({ contentMarkdown: "# New" })).toEqual(markdownToDoc("# New"));
});
