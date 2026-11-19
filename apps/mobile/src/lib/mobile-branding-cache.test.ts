import { describe, expect, test } from "bun:test";
import { DEFAULT_RESOLVED_BRANDING, resolveBrandingSettings } from "@rtnote/shared/branding";
import {
  MOBILE_BRANDING_REFRESH_INTERVAL_MS,
  parseMobileBrandingCache,
  resolveMobileBrandingLogoUri,
  selectMobileBranding,
  serializeMobileBrandingCache,
  shouldRefreshMobileBranding,
  type MobileBrandingCache,
} from "./mobile-branding-cache";

const instance = resolveBrandingSettings([{ name: "Acme", accent: "#2563eb" }]);
const workspace = resolveBrandingSettings([{ name: "Acme" }, { name: "Acme Legal", logoAssetId: "bra_logo1234" }]);
const cache: MobileBrandingCache = { baseUrl: "https://notes.example.com", instance, workspace, fetchedAt: 1_700_000_000_000 };

describe("mobile branding cache", () => {
  test("round-trips through storage", () => {
    expect(parseMobileBrandingCache(serializeMobileBrandingCache(cache))).toEqual(cache);
  });

  test("ignores missing, malformed or foreign values", () => {
    expect(parseMobileBrandingCache(null)).toBeNull();
    expect(parseMobileBrandingCache("")).toBeNull();
    expect(parseMobileBrandingCache("{not json")).toBeNull();
    expect(parseMobileBrandingCache("[]")).toBeNull();
    expect(parseMobileBrandingCache(JSON.stringify({ instance }))).toBeNull();
    expect(parseMobileBrandingCache(JSON.stringify({ ...cache, baseUrl: "javascript:alert(1)" }))).toBeNull();
  });

  test("validates the stored branding with coerceResolvedBranding", () => {
    const parsed = parseMobileBrandingCache(JSON.stringify({
      baseUrl: "https://notes.example.com/",
      instance: { name: "Evil\u0000Name", logoUrl: "javascript:alert(1)", colors: { light: { accent: "red" } } },
      workspace: null,
      fetchedAt: "yesterday",
    }));
    expect(parsed).not.toBeNull();
    expect(parsed!.baseUrl).toBe("https://notes.example.com");
    expect(parsed!.instance.name).toBe("Evil Name");
    expect(parsed!.instance.logoUrl).toBe("");
    expect(parsed!.instance.colors.light.accent).toBe(DEFAULT_RESOLVED_BRANDING.colors.light.accent);
    expect(parsed!.workspace).toBeNull();
    expect(parsed!.fetchedAt).toBe(0);
  });

  test("selects workspace branding only while signed in to the cached server", () => {
    expect(selectMobileBranding(null, null)).toBe(DEFAULT_RESOLVED_BRANDING);
    expect(selectMobileBranding(null, "https://notes.example.com")).toBe(DEFAULT_RESOLVED_BRANDING);
    expect(selectMobileBranding(cache, null)).toBe(instance);
    expect(selectMobileBranding(cache, "https://notes.example.com")).toBe(workspace);
    expect(selectMobileBranding(cache, "https://notes.example.com/")).toBe(workspace);
    expect(selectMobileBranding({ ...cache, workspace: null }, "https://notes.example.com")).toBe(instance);
    expect(selectMobileBranding(cache, "https://other.example.com")).toBe(DEFAULT_RESOLVED_BRANDING);
  });

  test("builds absolute logo URLs per theme", () => {
    const dual = { ...workspace, logoUrl: "/api/public/branding/assets/bra_light123", logoDarkUrl: "/api/public/branding/assets/bra_dark1234" };
    expect(resolveMobileBrandingLogoUri(dual, "https://notes.example.com/", "light")).toBe("https://notes.example.com/api/public/branding/assets/bra_light123");
    expect(resolveMobileBrandingLogoUri(dual, "https://notes.example.com", "dark")).toBe("https://notes.example.com/api/public/branding/assets/bra_dark1234");
    expect(resolveMobileBrandingLogoUri({ ...dual, logoDarkUrl: "" }, "https://notes.example.com", "dark")).toBe("https://notes.example.com/api/public/branding/assets/bra_light123");
    expect(resolveMobileBrandingLogoUri(dual, null, "light")).toBe("");
    expect(resolveMobileBrandingLogoUri(DEFAULT_RESOLVED_BRANDING, "https://notes.example.com", "light")).toBe("");
  });

  test("throttles foreground refreshes", () => {
    expect(shouldRefreshMobileBranding(0, Date.now())).toBe(true);
    expect(shouldRefreshMobileBranding(10_000, 10_000 + MOBILE_BRANDING_REFRESH_INTERVAL_MS - 1)).toBe(false);
    expect(shouldRefreshMobileBranding(10_000, 10_000 + MOBILE_BRANDING_REFRESH_INTERVAL_MS)).toBe(true);
  });
});
