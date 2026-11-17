import { afterEach, describe, expect, test } from "bun:test";
import { coerceResolvedBranding, DEFAULT_RESOLVED_BRANDING, resolveBrandingSettings } from "@edgeever/shared/branding";
import { applyMobileBrandingColors, buildMobileBrandColorMaps, mobileBrandColorKey } from "./mobile-branding-colors";
import {
  getMobileBrandColorKey,
  mobileThemeStylesKey,
  resolveMobileThemeColor,
  resolveMobileThemeStyles,
  setMobileBrandColorMaps,
  subscribeMobileBrandColors,
} from "./mobile-theme-colors";

const SAMPLE_STYLES = {
  button: { backgroundColor: "#047857", borderColor: "#a7f3d0", color: "#ffffff" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" },
  badge: { backgroundColor: "#ecfdf5", color: "#047857" },
};

afterEach(() => {
  setMobileBrandColorMaps(null, "");
});

describe("mobile branding colours", () => {
  test("default branding builds no maps and leaves every colour as it was", () => {
    expect(mobileBrandColorKey(DEFAULT_RESOLVED_BRANDING)).toBe("");
    expect(buildMobileBrandColorMaps(DEFAULT_RESOLVED_BRANDING)).toBeNull();
    expect(buildMobileBrandColorMaps(resolveBrandingSettings([{}]))).toBeNull();
    expect(applyMobileBrandingColors(DEFAULT_RESOLVED_BRANDING)).toBe(false);
    expect(getMobileBrandColorKey()).toBe("");
    expect(mobileThemeStylesKey("light")).toBe("light");
    expect(resolveMobileThemeStyles(SAMPLE_STYLES, "light")).toBe(SAMPLE_STYLES);
    expect(resolveMobileThemeColor("#047857", "light")).toBe("#047857");
    expect(resolveMobileThemeColor("#047857", "dark")).toBe("#6ee7b7");
  });

  test("a name or logo alone does not touch colours", () => {
    const branding = resolveBrandingSettings([{ name: "Acme Notes", logoAssetId: "bra_abcdef12" }]);
    expect(branding.isCustom).toBe(true);
    expect(buildMobileBrandColorMaps(branding)).toBeNull();
  });

  test("a custom accent recolours the stock greens in light mode", () => {
    const branding = resolveBrandingSettings([{ accent: "#2563eb" }]);
    const maps = buildMobileBrandColorMaps(branding);
    expect(maps).not.toBeNull();
    expect(maps!.light.background["#10b981"]).toBe("#2563eb");
    expect(maps!.light.foreground["#16a06e"]).toBe("#2563eb");
    // 700 shade: 34% towards black.
    expect(maps!.light.background["#047857"]).toBe("#18419b");
    // 50 shade: a faint tint over white.
    expect(maps!.light.background["#ecfdf5"]).toBe("#f2f6fe");
    // Neutrals are not part of an accent-only branding.
    expect(maps!.light.background["#ffffff"]).toBeUndefined();
    expect(maps!.light.foreground["#0f172a"]).toBeUndefined();
  });

  test("dark mode keeps solid fills solid and adapts tints and text", () => {
    const maps = buildMobileBrandColorMaps(resolveBrandingSettings([{ accent: "#2563eb" }]))!;
    // Stock keeps a #047857 button fill in dark mode, so the branded fill stays the light 700 shade.
    expect(maps.dark.background["#047857"]).toBe(maps.light.background["#047857"]);
    // Stock lightens #047857 text in dark mode; the branded text is lighter than the accent.
    expect(maps.dark.foreground["#047857"]).toBe("#87a9f4");
    // Stock darkens the #ecfdf5 tint in dark mode; the branded tint sits over the dark surface.
    expect(maps.dark.background["#ecfdf5"]).toBe("#122041");
  });

  test("installed maps flow through the resolvers and change the style cache key", () => {
    const calls: string[] = [];
    const unsubscribe = subscribeMobileBrandColors(() => calls.push(getMobileBrandColorKey()));
    const branding = resolveBrandingSettings([{ accent: "#2563eb" }]);
    expect(applyMobileBrandingColors(branding)).toBe(true);
    expect(applyMobileBrandingColors(branding)).toBe(false);
    expect(calls).toHaveLength(1);
    expect(mobileThemeStylesKey("light")).not.toBe("light");

    const light = resolveMobileThemeStyles(SAMPLE_STYLES, "light");
    expect(light).not.toBe(SAMPLE_STYLES);
    expect(light.button).toEqual({ backgroundColor: "#18419b", borderColor: "#bed0f9", color: "#ffffff" });
    expect(light.card).toEqual(SAMPLE_STYLES.card);
    expect(resolveMobileThemeColor("#047857", "light")).toBe("#18419b");
    expect(resolveMobileThemeColor("#047857", "dark")).toBe("#87a9f4");
    // Untouched colours still use the stock dark palette.
    expect(resolveMobileThemeColor("#0f172a", "dark")).toBe("#f8fafc");

    expect(applyMobileBrandingColors(DEFAULT_RESOLVED_BRANDING)).toBe(true);
    expect(resolveMobileThemeStyles(SAMPLE_STYLES, "light")).toBe(SAMPLE_STYLES);
    expect(calls).toHaveLength(2);
    unsubscribe();
  });

  test("a colour preset also maps the neutral palette", () => {
    const maps = buildMobileBrandColorMaps(resolveBrandingSettings([{ colors: { preset: "sand" } }]))!;
    expect(maps.light.background["#f8fafc"]).toBe("#f5f1ea");
    expect(maps.light.background["#ffffff"]).toBe("#fcfaf6");
    expect(maps.light.foreground["#0f172a"]).toBe("#2a231b");
    expect(maps.light.border["#e2e8f0"]).toBe("#e2d9cb");
    expect(maps.dark.background["#ffffff"]).toBe("#24201a");
    expect(maps.dark.foreground["#0f172a"]).toBe("#ece3d6");
    expect(maps.light.background["#10b981"]).toBe("#b45309");
    expect(maps.dark.background["#10b981"]).toBe("#f59e0b");
    // White text on coloured buttons is not a surface and stays white.
    expect(maps.light.foreground["#ffffff"]).toBeUndefined();
  });

  test("only customised neutral tokens are mapped", () => {
    const maps = buildMobileBrandColorMaps(resolveBrandingSettings([{ colors: { light: { surface: "#fffdf8" } } }]))!;
    expect(maps.light.background["#ffffff"]).toBe("#fffdf8");
    expect(maps.light.background["#f8fafc"]).toBeUndefined();
    expect(maps.light.foreground["#64748b"]).toBeUndefined();
    expect(maps.dark.background["#ffffff"]).toBeUndefined();
  });

  test("branding read back from a cache builds the same maps as the original", () => {
    const branding = resolveBrandingSettings([{ colors: { preset: "ocean" }, accent: "#0ea5e9" }]);
    const roundTripped = coerceResolvedBranding(JSON.parse(JSON.stringify(branding)));
    expect(mobileBrandColorKey(roundTripped)).toBe(mobileBrandColorKey(branding));
    expect(buildMobileBrandColorMaps(roundTripped)).toEqual(buildMobileBrandColorMaps(branding));
  });
});
