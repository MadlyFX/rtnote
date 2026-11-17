import { describe, expect, test } from "bun:test";
import { magazineChromeLabel } from "./magazine-chrome-copy.ts";
import { stripHeadingNumberPrefix } from "./heading-numbering.zh-CN.ts";

describe("magazine chrome copy", () => {
  test("defaults to English and fills in counts", () => {
    expect(magazineChromeLabel("sectionCount", undefined, { count: 3 })).toBe("3 sections");
    expect(magazineChromeLabel("publishOutline", "pl", { count: 2 })).toBe("2 PARTS · CONTENTS");
    expect(magazineChromeLabel("sectionFallback", "en-US", { number: "04" })).toBe("Section 04");
  });

  test("uses the Chinese variant for Chinese UI locales", () => {
    for (const locale of ["zh-CN", "zh-TW"]) {
      const label = magazineChromeLabel("sectionCount", locale, { count: 3 });
      expect(label).not.toBe("3 sections");
      expect(label.startsWith("3 ")).toBe(true);
    }
    expect(magazineChromeLabel("publishOutline", "zh-CN", { count: 2 }).startsWith("2 PARTS · ")).toBe(true);
  });

  test("strips plain numeric section prefixes", () => {
    expect(stripHeadingNumberPrefix("1. Getting started")).toBe("Getting started");
    expect(stripHeadingNumberPrefix("  12: Wrap-up ")).toBe("Wrap-up");
    expect(stripHeadingNumberPrefix("No number here")).toBe("No number here");
  });
});
