import { describe, expect, test } from "bun:test";
import { enUS } from "@edgeever/shared/i18n/en-US";
import { ja } from "@edgeever/shared/i18n/ja";
import { pl } from "@edgeever/shared/i18n/pl";
import { zhCN } from "@edgeever/shared/i18n/zh-CN";
import { findInlineFields, formatInlineFieldChip, rangesOverlap } from "./inline-fields.ts";

const translatorFor = (catalog) => (key) => key.split(".").reduce((node, part) => node?.[part], catalog) ?? key;

describe("inline fields", () => {
  test("finds Dataview bracket fields in a task line", () => {
    const text = "Review panel [priority:: highest] [scheduled:: 2026-09-10] [due:: 2026-09-10]";
    const fields = findInlineFields(text);
    expect(fields.map((field) => field.key)).toEqual(["priority", "scheduled", "due"]);
    expect(fields.map((field) => field.value)).toEqual(["highest", "2026-09-10", "2026-09-10"]);
    expect(text.slice(fields[0].from, fields[0].to)).toBe("[priority:: highest]");
  });

  test("formats quiet chips instead of raw syntax", () => {
    expect(formatInlineFieldChip("due", "2026-09-10", translatorFor(zhCN))).toBe(`${zhCN.inlineField.label.due} 2026-09-10`);
    expect(formatInlineFieldChip("priority", "highest", translatorFor(zhCN))).toBe(`${zhCN.inlineField.label.priority} ${zhCN.inlineField.priority.highest}`);
    expect(formatInlineFieldChip("due", "2026-09-10", translatorFor(enUS))).toBe("Due 2026-09-10");
  });

  test("reads chip labels from the active locale catalog instead of falling back to English", () => {
    expect(ja.inlineField.label.due).not.toBe(enUS.inlineField.label.due);
    expect(formatInlineFieldChip("due", "2026-09-10", translatorFor(ja))).toBe(`${ja.inlineField.label.due} 2026-09-10`);
    expect(formatInlineFieldChip("priority", "High", translatorFor(pl))).toBe("Priorytet Wysoki");
  });

  test("leaves unknown keys and priority values as authored", () => {
    expect(formatInlineFieldChip("custom", "value", translatorFor(enUS))).toBe("custom value");
    expect(formatInlineFieldChip("priority", "urgent", translatorFor(enUS))).toBe("Priority urgent");
  });

  test("keeps the raw field editable when the caret is inside it", () => {
    expect(rangesOverlap(5, 27, 10)).toBe(true);
    expect(rangesOverlap(5, 27, 27)).toBe(true);
    expect(rangesOverlap(5, 27, 4)).toBe(false);
  });
});
