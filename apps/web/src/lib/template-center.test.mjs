import { describe, expect, test } from "bun:test";
import { DEFAULT_MEMO_TEMPLATE_SEEDS } from "@rtnote/shared/memo-template-seeds";
import { createTemplateCards, createTemplateDraft, templateDraftToPayload } from "./template-center.ts";

const quickNote = DEFAULT_MEMO_TEMPLATE_SEEDS.find((seed) => seed.key === "quick-note");
const chinese = quickNote.translations["zh-CN"];
const polish = quickNote.translations.pl;
const storedChinese = {
  id: "ws_default_template_quick-note",
  name: chinese.title,
  description: chinese.description,
  title: chinese.title,
  contentJson: { type: "doc", content: [] },
  contentMarkdown: chinese.contentMarkdown,
  tags: ["template", "quick-note"],
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
};

describe("template center", () => {
  test("shows an unedited default template in the UI language but edits the stored one", () => {
    const [card] = createTemplateCards([storedChinese], "pl");

    expect(card.display.name).toBe(polish.title);
    expect(card.display.contentMarkdown).toBe(polish.contentMarkdown);
    expect(card.template).toBe(storedChinese);
  });

  test("a name-only edit in another UI language keeps the other stored fields", () => {
    const [card] = createTemplateCards([storedChinese], "pl");
    const draft = { ...createTemplateDraft(card.template), name: "Moja notatka" };

    // The untouched body is not resent, so the stored Markdown stays exact.
    expect(templateDraftToPayload(draft)).toEqual({
      name: "Moja notatka",
      description: chinese.description,
      title: chinese.title,
      tags: ["template", "quick-note"],
    });
  });

  test("an edited body is sent as rich text with a generated Markdown copy", () => {
    const contentJson = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "New body" }] }] };
    const draft = { ...createTemplateDraft(storedChinese), contentJson, contentChanged: true };
    expect(templateDraftToPayload(draft)).toMatchObject({ contentJson, contentMarkdown: "New body" });
  });
});
