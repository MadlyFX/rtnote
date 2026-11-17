import { describe, expect, test } from "bun:test";
import {
  absolutizeBrandingUrls,
  brandForeground,
  BrandingSettingsSchema,
  brandingCssVariables,
  brandingStylesheet,
  coerceResolvedBranding,
  compactBrandingSettings,
  DEFAULT_RESOLVED_BRANDING,
  mergeBrandingSettings,
  readBrandingSettings,
  resolveBrandingSettings,
  withBrandName,
} from "./branding.ts";

describe("branding settings", () => {
  test("built-in branding is RTNote and changes no colour token", () => {
    const resolved = resolveBrandingSettings([]);
    expect(resolved).toEqual(DEFAULT_RESOLVED_BRANDING);
    expect(resolved.isCustom).toBe(false);
    expect(brandingStylesheet(resolved)).toBe("");
    // Choosing the default preset explicitly is still the stock look.
    expect(brandingStylesheet(resolveBrandingSettings([{ colors: { preset: "default" } }]))).toBe("");
  });

  test("names are cleaned, colours normalised, and unknown fields rejected", () => {
    expect(BrandingSettingsSchema.parse({ name: " \n Team\u0007 Notes ", accent: "#ABC" })).toEqual({ name: "Team Notes", accent: "#aabbcc" });
    expect(BrandingSettingsSchema.parse({ name: "x".repeat(100) }).name).toHaveLength(48);
    expect(BrandingSettingsSchema.safeParse({ accent: "url(evil)" }).success).toBe(false);
    expect(BrandingSettingsSchema.safeParse({ logoUrl: "https://x.test/a.png" }).success).toBe(false);
    expect(BrandingSettingsSchema.safeParse({ logoAssetId: "../etc/passwd" }).success).toBe(false);
    expect(BrandingSettingsSchema.safeParse({ footer: { links: [{ label: "a", url: "javascript:alert(1)" }] } }).success).toBe(false);
    expect(BrandingSettingsSchema.safeParse({ footer: { links: [{ label: "a", url: "https://u:p@x.test" }] } }).success).toBe(false);
    expect(readBrandingSettings("{broken")).toEqual({});
    expect(readBrandingSettings('{"name":"Ok","bogus":1}')).toEqual({});
  });

  test("compacting drops empty values so a level only lists what it overrides", () => {
    expect(compactBrandingSettings({ name: "", logoAssetId: null, colors: { light: {}, dark: {} }, fonts: {}, footer: { text: "", links: [] } })).toEqual({});
    expect(compactBrandingSettings({ accent: "#123456", colors: { light: { text: "#000000" } } })).toEqual({ accent: "#123456", colors: { light: { text: "#000000" } } });
  });

  test("later levels win field by field; a preset starts the colour scheme over", () => {
    const instance = { name: "Acme", accent: "#111111", colors: { light: { background: "#ffffff" } }, footer: { text: "Acme Inc." } };
    const workspace = { logoAssetId: "bra_workspace1" };
    expect(resolveBrandingSettings([instance, workspace])).toMatchObject({
      name: "Acme",
      color: "#111111",
      logoUrl: "/api/public/branding/assets/bra_workspace1",
      footer: { text: "Acme Inc." },
    });
    const notebook = { colors: { preset: "ocean" } };
    const merged = mergeBrandingSettings([instance, workspace, notebook]);
    expect(merged.accent).toBeUndefined();
    expect(merged.colors).toEqual({ preset: "ocean" });
    const resolved = resolveBrandingSettings([instance, workspace, notebook]);
    expect(resolved.colors.light.background).toBe("#eef3f8");
    expect(resolved.colors.light.accent).toBe("#2563eb");
    // An accent on the same level as the preset still applies.
    expect(resolveBrandingSettings([{ colors: { preset: "ocean" }, accent: "#ff0000" }]).colors.dark.accent).toBe("#ff0000");
  });

  test("dark logo and favicon fall back to the logo", () => {
    const resolved = resolveBrandingSettings([{ logoAssetId: "bra_logo123", faviconAssetId: "bra_icon123" }]);
    expect(resolved.logoDarkUrl).toBe(resolved.logoUrl);
    expect(resolved.faviconUrl).toBe("/api/public/branding/assets/bra_icon123");
  });
});

describe("colour tokens", () => {
  test("an accent drives the whole accent scale in both modes", () => {
    const resolved = resolveBrandingSettings([{ accent: "#2563eb" }]);
    const light = brandingCssVariables(resolved, "light");
    expect(light["--brand-green"]).toBe("#2563eb");
    expect(light["--brand-green-500-rgb"]).toBe("37 99 235");
    expect(light["--brand-green-rgb"]).toBe("37 99 235");
    expect(Object.keys(light).filter((name) => /^--brand-green-\d+-rgb$/.test(name))).toHaveLength(11);
    // Surfaces were not customised, so they keep the stock values.
    expect(light["--workspace-canvas"]).toBeUndefined();
    expect(brandingCssVariables(resolved, "dark")["--brand-green-text"]).toBeDefined();
  });

  test("a colour scheme drives surfaces, text, borders and the shadcn tokens", () => {
    const resolved = resolveBrandingSettings([{ colors: { preset: "sand" } }]);
    const dark = brandingCssVariables(resolved, "dark");
    expect(dark["--workspace-canvas"]).toBe("#16130f");
    expect(dark["--workspace-sidebar"]).toBe("#1c1813");
    expect(dark["--background"]).toMatch(/^\d+ [\d.]+% [\d.]+%$/);
    expect(dark["--foreground"]).toMatch(/^\d+ [\d.]+% [\d.]+%$/);
    expect(dark["--border"]).toBeDefined();
    const css = brandingStylesheet(resolved);
    expect(css).toStartWith(":root{");
    expect(css).toContain("\n:root.dark{");
    expect(css).not.toContain("<");
  });
});

describe("resolved branding from untrusted sources", () => {
  test("only server asset paths and HTTPS images survive", () => {
    const resolved = coerceResolvedBranding({
      name: "<b>Evil</b>",
      logoUrl: "javascript:alert(1)",
      logoDarkUrl: "https://cdn.test/dark.png",
      faviconUrl: "/api/public/branding/assets/../../secret",
      colors: { light: { accent: "red" } },
      fonts: { body: "comic" },
      footer: { links: [{ label: "x", url: "http://plain.test" }, { label: "ok", url: "https://ok.test" }] },
    });
    expect(resolved.logoUrl).toBe("");
    expect(resolved.logoDarkUrl).toBe("https://cdn.test/dark.png");
    expect(resolved.faviconUrl).toBe("");
    expect(resolved.colors.light.accent).toBe("#16a06e");
    expect(resolved.fonts.body).toBe("system");
    expect(resolved.footer.links).toEqual([{ label: "ok", url: "https://ok.test" }]);
    expect(coerceResolvedBranding(null)).toEqual(DEFAULT_RESOLVED_BRANDING);
    expect(coerceResolvedBranding(DEFAULT_RESOLVED_BRANDING).isCustom).toBe(false);
  });

  test("clients not served from the server get absolute asset URLs", () => {
    const resolved = resolveBrandingSettings([{ logoAssetId: "bra_logo123" }]);
    const absolute = absolutizeBrandingUrls(resolved, "https://notes.example.com/");
    expect(absolute.logoUrl).toBe("https://notes.example.com/api/public/branding/assets/bra_logo123");
    expect(coerceResolvedBranding(absolute).logoUrl).toBe(absolute.logoUrl);
    expect(absolutizeBrandingUrls(resolved, "")).toBe(resolved);
  });

  test("button text stays readable and names are inserted literally", () => {
    expect(brandForeground("#ffffff")).toBe("#000000");
    expect(brandForeground("#777777")).toBe("#000000");
    expect(brandForeground("#747474")).toBe("#FFFFFF");
    expect(withBrandName("Welcome to RTNote", "$& Notes")).toBe("Welcome to $& Notes");
  });
});
