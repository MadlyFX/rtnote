import { describe, expect, test } from "bun:test";
import { markdownToDoc, resolveMemoContentMarkdown } from "@rtnote/shared";

describe("mobile memo detail content", () => {
  test("keeps JSON divider nodes when the Markdown compatibility copy is stale", () => {
    const richContent = markdownToDoc("First note body\n\n---\n\nSecond note body");
    const resolved = resolveMemoContentMarkdown(richContent, "First note body Second note body");

    expect(resolved).toContain("First note body\n\n---\n\nSecond note body");
  });
});
