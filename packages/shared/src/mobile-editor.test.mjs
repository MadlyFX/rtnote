import { describe, expect, test } from "bun:test";
import {
  MOBILE_EDITOR_ACTIVE_FLAGS,
  MOBILE_EDITOR_TOOLBAR_ACTIONS,
  getMobileEditorCopy,
  getMobileEditorInputAttributes,
  getMobileEditorImageScaleLabel,
  getMobileEditorImageWidthPresetLabel,
  getMobileEditorPlaceholder,
  getMobileEditorToolbarActionLabel,
  getMobileEditorToolbarLabel,
} from "./mobile-editor.ts";

describe("mobile editor contract", () => {
  test("keeps undo and redo at the start of the mobile toolbar", () => {
    expect(MOBILE_EDITOR_TOOLBAR_ACTIONS.map(({ id }) => id)).toEqual([
      "undo",
      "redo",
      "image",
      "voiceMemo",
      "bold",
      "bulletList",
      "taskList",
      "increaseListIndent",
      "decreaseListIndent",
      "blockquote",
      "horizontalRule",
      "format",
    ]);
    expect(MOBILE_EDITOR_TOOLBAR_ACTIONS.find(({ id }) => id === "bold")?.activeFlag).toBe(
      MOBILE_EDITOR_ACTIVE_FLAGS.bold
    );
  });

  test("provides the same localized copy to both mobile clients", () => {
    const expectCopy = (read, expected) => {
      for (const [locale, value] of Object.entries(expected)) expect({ locale, value: read(locale) }).toEqual({ locale, value });
    };
    expectCopy(getMobileEditorPlaceholder, { "zh-CN": "开始记录...", "en-US": "Start writing..." });
    expectCopy(getMobileEditorToolbarLabel, { "zh-CN": "编辑器工具栏" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("undo", locale), { "zh-CN": "撤销", ja: "元に戻す" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("redo", locale), { "en-US": "Redo" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("voiceMemo", locale), { "en-US": "Voice memo" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("bulletList", locale), { "en-US": "Bullet list" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("taskList", locale), { "zh-CN": "任务清单" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("increaseListIndent", locale), { "zh-CN": "增加列表层级（Tab）" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("decreaseListIndent", locale), { "en-US": "Decrease list level (Shift + Tab)" });
    expectCopy((locale) => getMobileEditorToolbarActionLabel("format", locale), { "en-US": "Format" });
    expectCopy(getMobileEditorImageScaleLabel, { "zh-CN": "图片显示尺寸" });
    expectCopy((locale) => getMobileEditorImageWidthPresetLabel("medium", locale), { "en-US": "Medium" });
  });

  test("writes the English attachment prefix in every locale", () => {
    for (const locale of ["zh-CN", "zh-TW", "en-US", "ja", "pl", "ru", "es", "de", "fr"]) {
      expect({ locale, prefix: getMobileEditorCopy(locale).attachmentPrefix }).toEqual({ locale, prefix: "Attachment: " });
    }
  });

  test("keeps mobile typing assistance enabled", () => {
    expect(getMobileEditorInputAttributes("editor-content")).toEqual({
      autocapitalize: "sentences",
      autocomplete: "on",
      autocorrect: "on",
      class: "editor-content",
      inputmode: "text",
      spellcheck: "true",
    });
  });
});

const collectCopyKeys = (value, prefix = "") =>
  typeof value === "string"
    ? [prefix]
    : Object.entries(value).flatMap(([key, child]) => collectCopyKeys(child, prefix ? `${prefix}.${key}` : key));

describe("mobile editor copy", () => {
  test("ships the same keys for every locale", () => {
    const englishKeys = collectCopyKeys(getMobileEditorCopy("en-US"));
    for (const locale of ["zh-CN", "ja", "pl", "ru"]) {
      expect({ locale, keys: collectCopyKeys(getMobileEditorCopy(locale)) }).toEqual({ locale, keys: englishKeys });
    }
  });

  test("localizes editor overlays instead of falling back to English", () => {
    const expected = { pl: "Kopiuj kod", ja: "コードをコピー", "zh-CN": "复制代码", ru: "Копировать код" };
    for (const [locale, copy] of Object.entries(expected)) {
      expect({ locale, copy: getMobileEditorCopy(locale).codeBlock.copy }).toEqual({ locale, copy });
    }
  });
});
