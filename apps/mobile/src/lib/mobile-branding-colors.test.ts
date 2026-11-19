import { afterEach, describe, expect, test } from "bun:test";
import { coerceResolvedBranding, DEFAULT_RESOLVED_BRANDING, resolveBrandingSettings } from "@rtnote/shared/branding";
import { applyMobileBrandingColors, buildMobileBrandColorMaps, MOBILE_STOCK_COLORS, mobileBrandColorKey } from "./mobile-branding-colors";
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

/** Branding whose colours match what the screens are written in. */
const STOCK_COLOR_BRANDING = resolveBrandingSettings([{ colors: { light: MOBILE_STOCK_COLORS.light, dark: MOBILE_STOCK_COLORS.dark } }]);

afterEach(() => {
  setMobileBrandColorMaps(null, "");
});

describe("mobile branding colours", () => {
  test("default branding maps the written palette to warm paper", () => {
    const maps = buildMobileBrandColorMaps(DEFAULT_RESOLVED_BRANDING)!;
    expect(maps).not.toBeNull();
    expect(buildMobileBrandColorMaps(resolveBrandingSettings([{}]))).toEqual(maps);
    expect(maps.light.background["#f8fafc"]).toBe("#f4efe6");
    expect(maps.light.background["#ffffff"]).toBe("#fbf8f2");
    expect(maps.light.foreground["#0f172a"]).toBe("#2b2620");
    expect(maps.light.border["#e2e8f0"]).toBe("#e2d9c9");
    expect(maps.light.background["#10b981"]).toBe("#b5501b");
    expect(maps.dark.background["#ffffff"]).toBe("#26221d");
    expect(maps.dark.foreground["#0f172a"]).toBe("#ece4d6");
    // White text on coloured buttons is not a surface and stays white.
    expect(maps.light.foreground["#ffffff"]).toBeUndefined();
  });

  test("colours matching the written palette build no maps and leave every colour as it was", () => {
    expect(mobileBrandColorKey(STOCK_COLOR_BRANDING)).toBe("");
    expect(buildMobileBrandColorMaps(STOCK_COLOR_BRANDING)).toBeNull();
    expect(applyMobileBrandingColors(STOCK_COLOR_BRANDING)).toBe(false);
    expect(getMobileBrandColorKey()).toBe("");
    expect(mobileThemeStylesKey("light")).toBe("light");
    expect(resolveMobileThemeStyles(SAMPLE_STYLES, "light")).toBe(SAMPLE_STYLES);
    expect(resolveMobileThemeColor("#047857", "light")).toBe("#047857");
    expect(resolveMobileThemeColor("#047857", "dark")).toBe("#6ee7b7");
  });

  test("a name or logo alone keeps the default colours", () => {
    const branding = resolveBrandingSettings([{ name: "Acme Notes", logoAssetId: "bra_abcdef12" }]);
    expect(branding.isCustom).toBe(true);
    expect(mobileBrandColorKey(branding)).toBe(mobileBrandColorKey(DEFAULT_RESOLVED_BRANDING));
    expect(buildMobileBrandColorMaps(branding)).toEqual(buildMobileBrandColorMaps(DEFAULT_RESOLVED_BRANDING));
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
    // Neutrals follow the default paper scheme.
    expect(maps!.light.background["#ffffff"]).toBe("#fbf8f2");
    expect(maps!.light.foreground["#0f172a"]).toBe("#2b2620");
  });

  test("dark mode keeps solid fills solid and adapts tints and text", () => {
    const maps = buildMobileBrandColorMaps(resolveBrandingSettings([{ accent: "#2563eb" }]))!;
    // Stock keeps a #047857 button fill in dark mode, so the branded fill stays the light 700 shade.
    expect(maps.dark.background["#047857"]).toBe(maps.light.background["#047857"]);
    // Stock lightens #047857 text in dark mode; the branded text is lighter than the accent.
    expect(maps.dark.foreground["#047857"]).toBe("#87a9f4");
    // Stock darkens the #ecfdf5 tint in dark mode; the branded tint sits over the dark surface.
    expect(maps.dark.background["#ecfdf5"]).toBe("#262a36");
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
    expect(light.card).toEqual({ backgroundColor: "#fbf8f2", borderColor: "#e2d9c9", color: "#2b2620" });
    expect(resolveMobileThemeColor("#047857", "light")).toBe("#18419b");
    expect(resolveMobileThemeColor("#047857", "dark")).toBe("#87a9f4");
    expect(resolveMobileThemeColor("#0f172a", "dark")).toBe("#ece4d6");

    expect(applyMobileBrandingColors(STOCK_COLOR_BRANDING)).toBe(true);
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

  test("only neutral tokens that differ from the written palette are mapped", () => {
    const maps = buildMobileBrandColorMaps(resolveBrandingSettings([{
      colors: { light: { ...MOBILE_STOCK_COLORS.light, surface: "#fffdf8" }, dark: MOBILE_STOCK_COLORS.dark },
    }]))!;
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
