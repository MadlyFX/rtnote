import { describe, expect, test } from "bun:test";
import { localizeMemoTemplateGalleryItem, MEMO_TEMPLATE_GALLERY } from "@edgeever/shared/memo-template-gallery";
import {
  createMemoSeedHasContent,
  galleryEntryToMobileSelectableTemplate,
  mobileTemplateToCreateSeed,
  toMobileSelectableTemplate,
} from "./mobile-templates";

describe("mobile-templates", () => {
  test("turns a gallery template into a create seed without saving it", () => {
    const entry = localizeMemoTemplateGalleryItem(MEMO_TEMPLATE_GALLERY[0], "pl");
    const selectable = galleryEntryToMobileSelectableTemplate(entry);

    expect(selectable.id).toBe("gallery:daily-journal");
    expect(mobileTemplateToCreateSeed(selectable)).toEqual({
      title: entry.title,
      contentMarkdown: entry.contentMarkdown,
      tagsText: "template, daily-journal",
    });
  });

  test("maps a persisted template to a selectable row", () => {
    const selectableSaved = toMobileSelectableTemplate(
      {
        id: "tpl_1",
        name: "My weekly report",
        description: "Team weekly report",
        title: "[Weekly report]",
        contentJson: { type: "doc", content: [] },
        contentMarkdown: "## This week",
        tags: ["work", "weekly"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );
    expect(selectableSaved.title).toBe("[Weekly report]");
    expect(mobileTemplateToCreateSeed(selectableSaved)).toEqual({
      title: "[Weekly report]",
      contentMarkdown: "## This week",
      tagsText: "work, weekly",
    });
  });

  test("detects whether a seed has user content", () => {
    expect(createMemoSeedHasContent({ title: "", contentMarkdown: "", tagsText: "" })).toBe(false);
    expect(createMemoSeedHasContent({ title: "a", contentMarkdown: "", tagsText: "" })).toBe(true);
    expect(createMemoSeedHasContent({ title: "", contentMarkdown: "x", tagsText: "" })).toBe(true);
    expect(createMemoSeedHasContent({ title: "", contentMarkdown: "", tagsText: "tag" })).toBe(true);
  });
});
