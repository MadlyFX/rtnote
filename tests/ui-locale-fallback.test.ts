import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const read = (relativePath: string) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

describe("unmatched locale fallback", () => {
  test("Android and iOS resolve Japanese to ja and other unmatched languages to English", () => {
    const mobileLocale = read("apps/mobile/src/lib/mobile-locale.tsx");
    const mobileUtils = read("apps/mobile/src/screens/workspace-utils.ts");
    const iosPreferences = read("apps/ios/EdgeEver/Data/Preferences/PreferencesStore.swift");
    const sharedLocales = read("packages/shared/src/i18n/locales.ts");

    expect(sharedLocales).toContain('"ja"');
    expect(mobileLocale).toContain("resolveSupportedLocale(Intl.DateTimeFormat().resolvedOptions().locale)");
    expect(mobileUtils).toContain("resolveSupportedLocale(Intl.DateTimeFormat().resolvedOptions().locale)");
    expect(iosPreferences).toContain("if code.hasPrefix(\"ja\") { return .japanese }");
  });
});
