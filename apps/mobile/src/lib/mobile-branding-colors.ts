import {
  DEFAULT_RESOLVED_BRANDING,
  hexToRgb,
  type BrandColorMode,
  type BrandColorScheme,
  type BrandColorToken,
  type ResolvedBranding,
} from "@rtnote/shared/branding";
import {
  setMobileBrandColorMaps,
  stockMobileDarkThemeColor,
  type MobileBrandColorMaps,
  type MobileThemeColorUsage,
} from "./mobile-theme-colors";

/**
 * Maps the hex literals the screens are written in to the server branding.
 * Screens keep their stock light-theme colours; `resolveMobileThemeColor`
 * consults these maps before the stock dark palette. Default branding builds
 * no maps, so the app stays exactly as it was.
 */

type Rgb = [number, number, number];
type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const USAGES: MobileThemeColorUsage[] = ["foreground", "background", "border"];

const toHex = (rgb: Rgb) => `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: Rgb, b: Rgb, amountOfB: number): Rgb => a.map((channel, index) => channel + (b[index]! - channel) * amountOfB) as Rgb;
const mixHex = (a: string, b: string, amountOfB: number) => toHex(mix(hexToRgb(a), hexToRgb(b), amountOfB));

/** The stock emerald/green hexes used across the app, by their place in the accent scale. */
const STOCK_ACCENT_SHADES: Record<string, Shade> = {
  "#ecfdf5": 50,
  "#ecfdf3": 50,
  "#f0fdf4": 50,
  "#d1fae5": 100,
  "#a7f3d0": 200,
  "#bbf7d0": 200,
  "#6ee7b7": 300,
  "#86efac": 300,
  "#34d399": 400,
  "#10b981": 500,
  "#16a06e": 500,
  "#059669": 600,
  "#047857": 700,
  "#15803d": 700,
  "#065f46": 800,
  "#064e3b": 900,
  "#14532d": 900,
};

/** Same shape as the web accent scale in `@rtnote/shared/branding`. */
const accentScale = (accent: string, mode: BrandColorMode, darkSurface: string): Record<Shade, string> => {
  const base = hexToRgb(accent);
  if (mode === "light") {
    return {
      50: toHex(mix(WHITE, base, 0.06)), 100: toHex(mix(WHITE, base, 0.13)), 200: toHex(mix(WHITE, base, 0.3)),
      300: toHex(mix(WHITE, base, 0.55)), 400: toHex(mix(WHITE, base, 0.82)), 500: toHex(base),
      600: toHex(mix(base, BLACK, 0.18)), 700: toHex(mix(base, BLACK, 0.34)), 800: toHex(mix(base, BLACK, 0.48)),
      900: toHex(mix(base, BLACK, 0.57)),
    };
  }
  const dark = hexToRgb(darkSurface);
  return {
    50: toHex(mix(dark, base, 0.12)), 100: toHex(mix(dark, base, 0.2)), 200: toHex(mix(dark, base, 0.45)),
    300: toHex(mix(base, WHITE, 0.15)), 400: toHex(mix(base, WHITE, 0.45)), 500: toHex(base),
    600: toHex(mix(base, WHITE, 0.1)), 700: toHex(mix(base, WHITE, 0.45)), 800: toHex(mix(base, WHITE, 0.65)),
    900: toHex(mix(base, WHITE, 0.82)),
  };
};

/** What the stock app shows for each branding token, so unchanged tokens keep today's colours. */
const MOBILE_STOCK_SCHEME: Record<BrandColorMode, Omit<BrandColorScheme, "accent" | "sidebar">> = {
  light: { background: "#f8fafc", surface: "#ffffff", text: "#0f172a", border: "#e2e8f0" },
  dark: { background: "#020617", surface: "#0f172a", text: "#f8fafc", border: "#334155" },
};

type NeutralToken = keyof (typeof MOBILE_STOCK_SCHEME)["light"];
type NeutralRule = {
  usage: MobileThemeColorUsage;
  hexes: string[];
  deps: NeutralToken[];
  value: (scheme: Record<NeutralToken, string>, mode: BrandColorMode) => string;
};

/**
 * Stock neutral (slate) hexes, keyed by their light-theme value. A rule only
 * applies when one of the tokens it is derived from was customised.
 */
const NEUTRAL_RULES: NeutralRule[] = [
  { usage: "background", hexes: ["#f8fafc", "#f7faf7"], deps: ["background"], value: (s) => s.background },
  { usage: "background", hexes: ["#ffffff"], deps: ["surface"], value: (s) => s.surface },
  { usage: "background", hexes: ["#f1f5f9"], deps: ["surface", "text"], value: (s, mode) => mixHex(s.surface, s.text, mode === "light" ? 0.05 : 0.08) },
  { usage: "foreground", hexes: ["#0f172a", "#020617", "#1e293b", "#17211a"], deps: ["text"], value: (s) => s.text },
  { usage: "foreground", hexes: ["#334155"], deps: ["text", "background"], value: (s, mode) => mixHex(s.text, s.background, mode === "light" ? 0.18 : 0.1) },
  { usage: "foreground", hexes: ["#475569"], deps: ["text", "background"], value: (s, mode) => mixHex(s.text, s.background, mode === "light" ? 0.3 : 0.12) },
  { usage: "foreground", hexes: ["#64748b"], deps: ["text", "background"], value: (s, mode) => mixHex(s.text, s.background, mode === "light" ? 0.42 : 0.22) },
  { usage: "foreground", hexes: ["#94a3b8"], deps: ["text", "background"], value: (s) => mixHex(s.text, s.background, 0.5) },
  { usage: "border", hexes: ["#e2e8f0", "#dce7dd"], deps: ["border"], value: (s) => s.border },
  { usage: "border", hexes: ["#cbd5e1", "#cad8cc"], deps: ["border", "text"], value: (s) => mixHex(s.border, s.text, 0.12) },
  { usage: "border", hexes: ["#f1f5f9"], deps: ["border", "surface"], value: (s) => mixHex(s.border, s.surface, 0.5) },
];

const emptyMaps = (): MobileBrandColorMaps => ({
  light: { foreground: {}, background: {}, border: {} },
  dark: { foreground: {}, background: {}, border: {} },
});

/** The colour part of the branding that affects the maps; equal keys build equal maps. */
export const mobileBrandColorKey = (branding: ResolvedBranding) => {
  if (!branding.isCustom) {
    return "";
  }
  const stock = DEFAULT_RESOLVED_BRANDING.colors;
  const changed = (["light", "dark"] as const).some((mode) =>
    (Object.keys(stock[mode]) as BrandColorToken[]).some((token) => branding.colors[mode][token] !== stock[mode][token]));
  return changed ? JSON.stringify(branding.colors) : "";
};

export const buildMobileBrandColorMaps = (branding: ResolvedBranding): MobileBrandColorMaps | null => {
  if (!mobileBrandColorKey(branding)) {
    return null;
  }
  const maps = emptyMaps();
  let entries = 0;
  const set = (mode: BrandColorMode, usage: MobileThemeColorUsage, hex: string, value: string) => {
    // A value equal to what the stock palette already shows adds nothing.
    const stockValue = mode === "light" ? hex : stockMobileDarkThemeColor(hex, usage);
    if (value === stockValue) return;
    maps[mode][usage][hex] = value;
    entries += 1;
  };

  for (const mode of ["light", "dark"] as const) {
    const scheme = branding.colors[mode];
    const stock = DEFAULT_RESOLVED_BRANDING.colors[mode];
    const customised = (token: NeutralToken) => scheme[token] !== stock[token];
    const effective = Object.fromEntries((Object.keys(MOBILE_STOCK_SCHEME[mode]) as NeutralToken[]).map((token) =>
      [token, customised(token) ? scheme[token] : MOBILE_STOCK_SCHEME[mode][token]])) as Record<NeutralToken, string>;

    for (const rule of NEUTRAL_RULES) {
      if (!rule.deps.some(customised)) continue;
      const value = rule.value(effective, mode);
      for (const hex of rule.hexes) set(mode, rule.usage, hex, value);
    }

    if (scheme.accent !== stock.accent) {
      const lightScale = accentScale(scheme.accent, "light", effective.surface);
      const modeScale = mode === "light" ? lightScale : accentScale(scheme.accent, "dark", effective.surface);
      for (const [hex, shade] of Object.entries(STOCK_ACCENT_SHADES)) {
        for (const usage of USAGES) {
          // In dark mode, hexes the stock palette adapts (tints, text) take the
          // dark scale; solid fills it keeps as they are keep the light shade.
          const adaptsInDark = mode === "dark" && stockMobileDarkThemeColor(hex, usage) !== hex;
          set(mode, usage, hex, (adaptsInDark ? modeScale : lightScale)[shade]);
        }
      }
    }
  }
  return entries > 0 ? maps : null;
};

/** Points every themed style at the given branding. Returns true when colours changed. */
export const applyMobileBrandingColors = (branding: ResolvedBranding) =>
  setMobileBrandColorMaps(buildMobileBrandColorMaps(branding), mobileBrandColorKey(branding));
