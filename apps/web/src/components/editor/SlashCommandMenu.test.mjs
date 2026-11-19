import { describe, expect, test } from "bun:test";
import {
  createSlashCommandItems,
  filterSlashCommandItems,
  formatCurrentDate,
  formatCurrentDateTime,
  formatCurrentTime,
} from "./SlashCommandMenu.tsx";
import { SLASH_COMMAND_KEYWORDS_ZH_CN } from "./slash-command-keywords.zh-CN.ts";

const labels = {
  menu: "Insert menu",
  empty: "No matching commands.",
  close: "Close menu",
  groups: { basic: "Basic blocks", insert: "Insert" },
  items: {
    paragraph: "Text",
    "heading-1": "Heading 1",
    "heading-2": "Heading 2",
    "heading-3": "Heading 3",
    "heading-4": "Heading 4",
    "heading-5": "Heading 5",
    "heading-6": "Heading 6",
    "bullet-list": "Bulleted list",
    "ordered-list": "Numbered list",
    "task-list": "Task list",
    blockquote: "Quote",
    "code-block": "Code block",
    divider: "Divider",
    fold: "Toggle block",
    table: "Table",
    mermaid: "Mermaid diagram",
    "inline-math": "Inline math",
    "block-math": "Math block",
    "current-date": "Current date",
    "current-time": "Current time",
    "current-date-time": "Current date and time",
    attachment: "Upload attachment",
    "voice-memo": "Voice memo",
    "note-link": "Link note",
    "external-link": "Insert link",
  },
};

// Chinese aliases come from the Simplified Chinese keyword file.
const zh = (id, index) => SLASH_COMMAND_KEYWORDS_ZH_CN[id][index];

describe("slash command menu", () => {
  const items = createSlashCommandItems(labels);

  test("shows all commands for a bare slash", () => {
    const unfilteredItems = filterSlashCommandItems(items, "");
    const heading6Index = unfilteredItems.findIndex((item) => item.id === "heading-6");

    expect(unfilteredItems).toHaveLength(25);
    expect(unfilteredItems.slice(heading6Index + 1, heading6Index + 4).map((item) => item.id)).toEqual([
      "current-date",
      "current-time",
      "current-date-time",
    ]);
  });

  test("searches localized labels and aliases", () => {
    // No AI command exists; "AI" only substring-matches "mermAId".
    expect(filterSlashCommandItems(items, "AI").map((item) => item.id)).toEqual(["mermaid"]);
    expect(filterSlashCommandItems(items, zh("task-list", 1)).map((item) => item.id)).toEqual(["task-list"]);
    expect(filterSlashCommandItems(items, "h2").map((item) => item.id)).toEqual(["heading-2"]);
    expect(filterSlashCommandItems(items, "h5").map((item) => item.id)).toEqual(["heading-5"]);
    expect(filterSlashCommandItems(items, zh("current-date", 1)).map((item) => item.id)).toEqual(["current-date"]);
    expect(filterSlashCommandItems(items, "timestamp").map((item) => item.id)).toEqual(["current-date-time"]);
  });

  test("assigns every item a unique lowercase slash command alias", () => {
    expect(items.map((item) => item.command)).toEqual([
      "text",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "date",
      "time",
      "datetime",
      "bullet",
      "numbered",
      "task",
      "quote",
      "code",
      "divider",
      "fold",
      "table",
      "mermaid",
      "math",
      "equation",
      "upload",
      "voice",
      "note",
      "link",
    ]);
    expect(items.every((item) => /^[a-z][a-z0-9]*$/.test(item.command))).toBe(true);
    expect(new Set(items.map((item) => item.command)).size).toBe(items.length);
    expect(filterSlashCommandItems(items, zh("fold", 0)).map((item) => item.id)).toEqual(["fold"]);
    expect(filterSlashCommandItems(items, "collapse").map((item) => item.id)).toEqual(["fold"]);
    expect(filterSlashCommandItems(items, "table").map((item) => item.id)).toEqual(["table"]);
    expect(filterSlashCommandItems(items, "task").map((item) => item.id)).toEqual(["task-list"]);
    expect(filterSlashCommandItems(items, zh("inline-math", 0)).map((item) => item.id)).toEqual(["inline-math", "block-math"]);
    expect(filterSlashCommandItems(items, "equation").map((item) => item.id)).toEqual(["block-math"]);
    expect(filterSlashCommandItems(items, "mermaid").map((item) => item.id)).toEqual(["mermaid"]);
    expect(filterSlashCommandItems(items, "flowchart").map((item) => item.id)).toEqual(["mermaid"]);
    expect(filterSlashCommandItems(items, zh("mermaid", 1)).map((item) => item.id)).toEqual(["mermaid"]);
    expect(filterSlashCommandItems(items, "record").map((item) => item.id)).toEqual(["voice-memo"]);
    expect(filterSlashCommandItems(items, zh("voice-memo", 0)).map((item) => item.id)).toEqual(["voice-memo"]);
  });

  test("formats local date and time as stable static text", () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);

    expect(formatCurrentDate(date)).toBe("2026-01-02");
    expect(formatCurrentTime(date)).toBe("03:04");
    expect(formatCurrentDateTime(date)).toBe("2026-01-02 03:04");
  });
});
