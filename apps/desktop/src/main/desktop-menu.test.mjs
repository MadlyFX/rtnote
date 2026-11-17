import { describe, expect, test } from "bun:test";
import * as ja from "./desktop-menu.ja.mjs";
import { desktopMenuCopy, screenshotRegionCopy } from "./desktop-menu.mjs";
import * as zhCN from "./desktop-menu.zh-CN.mjs";
import * as zhTW from "./desktop-menu.zh-TW.mjs";

describe("desktop native menu localization", () => {
  test("uses the Simplified Chinese catalog for Chinese Windows locales", () => {
    expect(desktopMenuCopy("zh-CN")).toBe(zhCN.menuCopy);
    expect(screenshotRegionCopy("zh-CN")).toBe(zhCN.regionCopy);
    expect(screenshotRegionCopy("en-US").cancel).toBe("Esc to cancel");
    expect(screenshotRegionCopy("ja")).toBe(ja.regionCopy);
  });

  test("recognizes other Chinese locale variants", () => {
    expect(desktopMenuCopy("zh-TW")).toBe(zhTW.menuCopy);
  });

  test("translations have exactly the English keys", () => {
    const menuKeys = Object.keys(desktopMenuCopy("en-US")).sort();
    const regionKeys = Object.keys(screenshotRegionCopy("en-US")).sort();
    for (const catalog of [ja, zhCN, zhTW]) {
      expect(Object.keys(catalog.menuCopy).sort()).toEqual(menuKeys);
      expect(Object.keys(catalog.regionCopy).sort()).toEqual(regionKeys);
    }
  });

  test("falls back to English for other or missing locales", () => {
    expect(desktopMenuCopy("en-US").file).toBe("File");
    expect(desktopMenuCopy(undefined).file).toBe("File");
    expect(desktopMenuCopy("it-IT").file).toBe("File");
    expect(screenshotRegionCopy("it-IT").cancel).toBe("Esc to cancel");
    expect(desktopMenuCopy("de-DE").file).toBe("Datei");
    expect(screenshotRegionCopy("de-DE").cancel).toBe("Esc zum Abbrechen");
    expect(desktopMenuCopy("fr-FR").file).toBe("Fichier");
    expect(screenshotRegionCopy("fr-FR").cancel).toBe("Échap pour annuler");
  });

  test("resolves region overlay copy for every desktop locale", () => {
    expect(screenshotRegionCopy("pl-PL").cancel).toBe("Esc anuluje");
    expect(screenshotRegionCopy("ja-JP")).toBe(ja.regionCopy);
    expect(screenshotRegionCopy("RU").cancel).toBe("Esc — отмена");
    expect(screenshotRegionCopy("zh_Hant")).toBe(zhTW.regionCopy);
  });
});
