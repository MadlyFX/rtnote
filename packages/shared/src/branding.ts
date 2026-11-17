import { z } from "zod";

/**
 * Server-side branding. Each level stores a partial profile; a page resolves
 * the levels that apply to it, later levels winning field by field:
 * built-in defaults, then the instance default, then the workspace, then a
 * shared notebook.
 */

export const DEFAULT_BRAND_NAME = "RTNote";
export const BRAND_NAME_MAX_LENGTH = 48;
export const BRAND_FOOTER_TEXT_MAX_LENGTH = 280;
export const BRAND_FOOTER_LINK_LIMIT = 6;
export const BRAND_ASSET_MAX_BYTES = 1024 * 1024;
export const BRAND_ASSET_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon"] as const;
export type BrandAssetMimeType = (typeof BRAND_ASSET_MIME_TYPES)[number];

export const BRAND_COLOR_TOKENS = ["background", "surface", "sidebar", "text", "border", "accent"] as const;
export type BrandColorToken = (typeof BRAND_COLOR_TOKENS)[number];
export type BrandColorScheme = Record<BrandColorToken, string>;
export type BrandColorMode = "light" | "dark";

/** Values match the stock stylesheet, so the default preset changes nothing. */
const DEFAULT_SCHEME: Record<BrandColorMode, BrandColorScheme> = {
  light: { background: "#eef1f4", surface: "#f8fafb", sidebar: "#e7ebef", text: "#212121", border: "#e1e5ea", accent: "#16a06e" },
  dark: { background: "#121315", surface: "#222325", sidebar: "#17181a", text: "#dedede", border: "#323437", accent: "#16a06e" },
};

export const BRAND_COLOR_PRESETS = {
  default: DEFAULT_SCHEME,
  ocean: {
    light: { background: "#eef3f8", surface: "#f8fbfd", sidebar: "#e3ebf3", text: "#14212e", border: "#d5e0ea", accent: "#2563eb" },
    dark: { background: "#0e141b", surface: "#18212b", sidebar: "#121a22", text: "#dbe5ef", border: "#2a3744", accent: "#60a5fa" },
  },
  graphite: {
    light: { background: "#f1f1f1", surface: "#fafafa", sidebar: "#e8e8e8", text: "#1a1a1a", border: "#dedede", accent: "#404040" },
    dark: { background: "#111111", surface: "#1e1e1e", sidebar: "#161616", text: "#e5e5e5", border: "#333333", accent: "#d4d4d4" },
  },
  sand: {
    light: { background: "#f5f1ea", surface: "#fcfaf6", sidebar: "#ede6db", text: "#2a231b", border: "#e2d9cb", accent: "#b45309" },
    dark: { background: "#16130f", surface: "#24201a", sidebar: "#1c1813", text: "#ece3d6", border: "#3a3329", accent: "#f59e0b" },
  },
  plum: {
    light: { background: "#f3f0f7", surface: "#fbfafd", sidebar: "#e9e3f1", text: "#221a2e", border: "#ddd5e8", accent: "#7c3aed" },
    dark: { background: "#13101a", surface: "#211c2b", sidebar: "#19151f", text: "#e6dff0", border: "#372f44", accent: "#a78bfa" },
  },
  rose: {
    light: { background: "#f7f0f1", surface: "#fdfafa", sidebar: "#efe4e6", text: "#2b1b1e", border: "#e8d6d9", accent: "#e11d48" },
    dark: { background: "#170f11", surface: "#261b1e", sidebar: "#1d1416", text: "#f0dfe2", border: "#3d2b2f", accent: "#fb7185" },
  },
} as const satisfies Record<string, Record<BrandColorMode, BrandColorScheme>>;
export type BrandColorPresetId = keyof typeof BRAND_COLOR_PRESETS;
export const BRAND_COLOR_PRESET_IDS = Object.keys(BRAND_COLOR_PRESETS) as BrandColorPresetId[];

/** System font stacks only: public pages must not depend on a font CDN. */
export const BRAND_FONTS = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
  sans: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif',
  slab: 'Rockwell, "Roboto Slab", "DejaVu Serif", Georgia, serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace',
} as const;
export type BrandFontId = keyof typeof BRAND_FONTS;
export const BRAND_FONT_IDS = Object.keys(BRAND_FONTS) as BrandFontId[];

const hexColor = z.string().trim().toLowerCase()
  .transform(value => /^#[0-9a-f]{3}$/.test(value) ? `#${Array.from(value.slice(1), c => c + c).join("")}` : value)
  .pipe(z.string().regex(/^#[0-9a-f]{6}$/));
const assetId = z.string().regex(/^bra_[A-Za-z0-9_-]{6,64}$/);
const httpsUrl = z.url({ protocol: /^https$/ }).max(2048).refine(value => {
  try {
    const url = new URL(value);
    return !url.username && !url.password;
  } catch {
    return false;
  }
});
const brandName = z.string().transform(value =>
  // Control characters never reach titles or headers.
  // oxlint-disable-next-line no-control-regex
  Array.from(value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()).slice(0, BRAND_NAME_MAX_LENGTH).join(""));
const partialScheme = z.object(Object.fromEntries(BRAND_COLOR_TOKENS.map(token => [token, hexColor.optional()])) as Record<BrandColorToken, z.ZodOptional<typeof hexColor>>).strict();

export const BrandingSettingsSchema = z.object({
  name: brandName.optional(),
  logoAssetId: assetId.nullable().optional(),
  logoDarkAssetId: assetId.nullable().optional(),
  faviconAssetId: assetId.nullable().optional(),
  accent: hexColor.optional(),
  colors: z.object({
    preset: z.enum(BRAND_COLOR_PRESET_IDS as [BrandColorPresetId, ...BrandColorPresetId[]]).optional(),
    light: partialScheme.optional(),
    dark: partialScheme.optional(),
  }).strict().optional(),
  fonts: z.object({
    heading: z.enum(BRAND_FONT_IDS as [BrandFontId, ...BrandFontId[]]).optional(),
    body: z.enum(BRAND_FONT_IDS as [BrandFontId, ...BrandFontId[]]).optional(),
  }).strict().optional(),
  footer: z.object({
    text: z.string().trim().max(BRAND_FOOTER_TEXT_MAX_LENGTH).optional(),
    links: z.array(z.object({ label: z.string().trim().min(1).max(60), url: httpsUrl }).strict()).max(BRAND_FOOTER_LINK_LIMIT).optional(),
  }).strict().optional(),
}).strict();
export type BrandingSettings = z.infer<typeof BrandingSettingsSchema>;

/** Stored JSON that fails validation is ignored rather than breaking a public page. */
export const readBrandingSettings = (raw: unknown): BrandingSettings => {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {};
    const parsed = BrandingSettingsSchema.safeParse(value);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

/** Drops empty values so a saved profile only lists what it overrides. */
export const compactBrandingSettings = (settings: BrandingSettings): BrandingSettings => {
  const out: BrandingSettings = {};
  if (settings.name) out.name = settings.name;
  for (const key of ["logoAssetId", "logoDarkAssetId", "faviconAssetId"] as const) {
    if (settings[key]) out[key] = settings[key];
  }
  if (settings.accent) out.accent = settings.accent;
  const colors = settings.colors;
  if (colors) {
    const light = colors.light && Object.keys(colors.light).length ? colors.light : undefined;
    const dark = colors.dark && Object.keys(colors.dark).length ? colors.dark : undefined;
    if (colors.preset || light || dark) out.colors = { ...(colors.preset ? { preset: colors.preset } : {}), ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
  }
  if (settings.fonts?.heading || settings.fonts?.body) out.fonts = { ...(settings.fonts.heading ? { heading: settings.fonts.heading } : {}), ...(settings.fonts.body ? { body: settings.fonts.body } : {}) };
  if (settings.footer?.text || settings.footer?.links?.length) out.footer = { ...(settings.footer.text ? { text: settings.footer.text } : {}), ...(settings.footer.links?.length ? { links: settings.footer.links } : {}) };
  return out;
};

export const brandAssetPath = (id: string) => `/api/public/branding/assets/${encodeURIComponent(id)}`;

export type BrandFooterLink = { label: string; url: string };

export type ResolvedBranding = {
  name: string;
  /** Light-mode logo, or "" for the built-in mark. */
  logoUrl: string;
  /** Dark-mode logo; falls back to the light logo. */
  logoDarkUrl: string;
  /** Favicon; falls back to the light logo, then "" for the built-in icon. */
  faviconUrl: string;
  /** Light-mode accent. Kept as `color` for existing callers. */
  color: string;
  colors: Record<BrandColorMode, BrandColorScheme>;
  fonts: { heading: BrandFontId; body: BrandFontId };
  footer: { text: string; links: BrandFooterLink[] };
  /** True when anything differs from the built-in RTNote branding. */
  isCustom: boolean;
};

const cloneScheme = (scheme: Record<BrandColorMode, BrandColorScheme>) => ({ light: { ...scheme.light }, dark: { ...scheme.dark } });

export const DEFAULT_RESOLVED_BRANDING: ResolvedBranding = Object.freeze({
  name: DEFAULT_BRAND_NAME,
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  color: DEFAULT_SCHEME.light.accent,
  colors: cloneScheme(DEFAULT_SCHEME),
  fonts: { heading: "system", body: "system" },
  footer: { text: "", links: [] },
  isCustom: false,
}) as ResolvedBranding;

/**
 * Merges the levels in order. A level that picks a colour preset starts the
 * colour scheme over, so a workspace preset is not muddied by colours the
 * instance customised.
 */
export const mergeBrandingSettings = (layers: ReadonlyArray<BrandingSettings | null | undefined>): BrandingSettings => {
  const merged: BrandingSettings = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.name) merged.name = layer.name;
    for (const key of ["logoAssetId", "logoDarkAssetId", "faviconAssetId"] as const) {
      if (layer[key]) merged[key] = layer[key];
    }
    if (layer.colors?.preset) {
      delete merged.accent;
      merged.colors = { preset: layer.colors.preset };
    }
    if (layer.accent) merged.accent = layer.accent;
    if (layer.colors?.light || layer.colors?.dark) {
      merged.colors = {
        ...merged.colors,
        light: { ...merged.colors?.light, ...layer.colors.light },
        dark: { ...merged.colors?.dark, ...layer.colors.dark },
      };
    }
    if (layer.fonts) merged.fonts = { ...merged.fonts, ...layer.fonts };
    if (layer.footer?.text) merged.footer = { ...merged.footer, text: layer.footer.text };
    if (layer.footer?.links?.length) merged.footer = { ...merged.footer, links: layer.footer.links };
  }
  return merged;
};

export const resolveBrandingSettings = (
  layers: ReadonlyArray<BrandingSettings | null | undefined>,
  options: { assetUrl?: (id: string) => string } = {},
): ResolvedBranding => {
  const assetUrl = options.assetUrl ?? brandAssetPath;
  const settings = mergeBrandingSettings(layers);
  const preset = BRAND_COLOR_PRESETS[settings.colors?.preset ?? "default"] ?? DEFAULT_SCHEME;
  const colors = cloneScheme(preset);
  if (settings.accent) {
    colors.light.accent = settings.accent;
    colors.dark.accent = settings.accent;
  }
  Object.assign(colors.light, settings.colors?.light);
  Object.assign(colors.dark, settings.colors?.dark);
  const logoUrl = settings.logoAssetId ? assetUrl(settings.logoAssetId) : "";
  const logoDarkUrl = settings.logoDarkAssetId ? assetUrl(settings.logoDarkAssetId) : logoUrl;
  const faviconUrl = settings.faviconAssetId ? assetUrl(settings.faviconAssetId) : logoUrl;
  const resolved: ResolvedBranding = {
    name: settings.name || DEFAULT_BRAND_NAME,
    logoUrl,
    logoDarkUrl,
    faviconUrl,
    color: colors.light.accent,
    colors,
    fonts: { heading: settings.fonts?.heading ?? "system", body: settings.fonts?.body ?? "system" },
    footer: { text: settings.footer?.text ?? "", links: settings.footer?.links ?? [] },
    isCustom: false,
  };
  resolved.isCustom = !isDefaultResolvedBranding(resolved);
  return resolved;
};

const sameScheme = (a: BrandColorScheme, b: BrandColorScheme) => BRAND_COLOR_TOKENS.every(token => a[token] === b[token]);
const isDefaultResolvedBranding = (branding: ResolvedBranding) =>
  branding.name === DEFAULT_BRAND_NAME && !branding.logoUrl && !branding.logoDarkUrl && !branding.faviconUrl
  && sameScheme(branding.colors.light, DEFAULT_SCHEME.light) && sameScheme(branding.colors.dark, DEFAULT_SCHEME.dark)
  && branding.fonts.heading === "system" && branding.fonts.body === "system"
  && !branding.footer.text && !branding.footer.links.length;

/** Validates a resolved branding object received from a server or a local cache. */
export const coerceResolvedBranding = (value: unknown): ResolvedBranding => {
  if (!value || typeof value !== "object") return DEFAULT_RESOLVED_BRANDING;
  const input = value as Partial<ResolvedBranding>;
  // Server asset paths, the same paths on an absolute server origin (desktop
  // and mobile load them from the configured server), or HTTPS URLs (legacy
  // notebook-site logos).
  const safeUrl = (url: unknown) => typeof url === "string"
    && (/^(?:https?:\/\/[^\s"'<>\\/]+)?\/api\/public\/branding\/assets\/[A-Za-z0-9_-]+$/.test(url) || /^https:\/\/[^\s"'<>\\]+$/.test(url))
    ? url : "";
  const color = (raw: unknown, fallback: string) => {
    const parsed = hexColor.safeParse(raw);
    return parsed.success ? parsed.data : fallback;
  };
  const scheme = (mode: BrandColorMode) => Object.fromEntries(BRAND_COLOR_TOKENS.map(token =>
    [token, color(input.colors?.[mode]?.[token], DEFAULT_SCHEME[mode][token])])) as BrandColorScheme;
  const font = (raw: unknown): BrandFontId => typeof raw === "string" && raw in BRAND_FONTS ? raw as BrandFontId : "system";
  const name = brandName.safeParse(typeof input.name === "string" ? input.name : "");
  const links = Array.isArray(input.footer?.links)
    ? input.footer.links.filter((link): link is BrandFooterLink => Boolean(link) && typeof link.label === "string" && httpsUrl.safeParse(link.url).success).slice(0, BRAND_FOOTER_LINK_LIMIT)
    : [];
  const resolved: ResolvedBranding = {
    name: (name.success && name.data) || DEFAULT_BRAND_NAME,
    logoUrl: safeUrl(input.logoUrl),
    logoDarkUrl: safeUrl(input.logoDarkUrl) || safeUrl(input.logoUrl),
    faviconUrl: safeUrl(input.faviconUrl) || safeUrl(input.logoUrl),
    color: "",
    colors: { light: scheme("light"), dark: scheme("dark") },
    fonts: { heading: font(input.fonts?.heading), body: font(input.fonts?.body) },
    footer: { text: typeof input.footer?.text === "string" ? input.footer.text.slice(0, BRAND_FOOTER_TEXT_MAX_LENGTH) : "", links },
    isCustom: false,
  };
  resolved.color = resolved.colors.light.accent;
  resolved.isCustom = !isDefaultResolvedBranding(resolved);
  return resolved;
};

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];
export const hexToRgb = (hex: string): Rgb => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
const rgbToHex = (rgb: Rgb) => `#${rgb.map(channel => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: Rgb, b: Rgb, amountOfB: number): Rgb => a.map((channel, index) => channel + (b[index]! - channel) * amountOfB) as Rgb;
const channels = (rgb: Rgb) => rgb.map(channel => Math.round(channel)).join(" ");

const relativeLuminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Black or white, whichever reads better on the given colour. */
export const brandForeground = (hex: string): string => relativeLuminance(hexToRgb(hex)) > 0.179 ? "#000000" : "#FFFFFF";

const hsl = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(value => value / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    hue = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(saturation * 1000) / 10}% ${Math.round(lightness * 1000) / 10}%`;
};

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** The accent scale behind `emerald-*` utilities, shaped like the stock green one. */
const accentScale = (accent: string, mode: BrandColorMode, background: string): Record<(typeof SHADES)[number], Rgb> => {
  const base = hexToRgb(accent);
  if (mode === "light") {
    return {
      50: mix(WHITE, base, 0.06), 100: mix(WHITE, base, 0.13), 200: mix(WHITE, base, 0.3), 300: mix(WHITE, base, 0.55),
      400: mix(WHITE, base, 0.82), 500: base, 600: mix(base, BLACK, 0.18), 700: mix(base, BLACK, 0.34),
      800: mix(base, BLACK, 0.48), 900: mix(base, BLACK, 0.57), 950: mix(base, BLACK, 0.77),
    };
  }
  const dark = hexToRgb(background);
  return {
    50: mix(dark, base, 0.12), 100: mix(dark, base, 0.2), 200: mix(dark, base, 0.45), 300: mix(base, WHITE, 0.15),
    400: mix(base, WHITE, 0.45), 500: base, 600: mix(base, WHITE, 0.1), 700: mix(base, WHITE, 0.45),
    800: mix(base, WHITE, 0.65), 900: mix(base, WHITE, 0.82), 950: mix(base, WHITE, 0.92),
  };
};

/**
 * CSS custom properties for one colour mode. Only tokens that differ from the
 * stock stylesheet are emitted, so default branding leaves the app untouched.
 */
export const brandingCssVariables = (branding: ResolvedBranding, mode: BrandColorMode): Record<string, string> => {
  const scheme = branding.colors[mode];
  const stock = DEFAULT_SCHEME[mode];
  const vars: Record<string, string> = {};
  if (scheme.accent !== stock.accent || scheme.background !== stock.background) {
    const scale = accentScale(scheme.accent, mode, scheme.background);
    for (const shade of SHADES) vars[`--brand-green-${shade}-rgb`] = channels(scale[shade]);
    const hover = scale[600];
    vars["--brand-green"] = rgbToHex(scale[500]);
    vars["--brand-green-rgb"] = channels(scale[500]);
    vars["--brand-green-hover"] = rgbToHex(hover);
    vars["--brand-green-hover-rgb"] = channels(hover);
    vars["--brand-green-muted"] = rgbToHex(scale[100]);
    vars["--brand-green-soft"] = rgbToHex(scale[50]);
    vars["--brand-green-border"] = rgbToHex(scale[200]);
    vars["--brand-green-text"] = rgbToHex(mode === "light" ? scale[700] : scale[400]);
    vars["--brand-accent-foreground"] = brandForeground(scheme.accent);
  }
  const background = hexToRgb(scheme.background);
  const surface = hexToRgb(scheme.surface);
  const text = hexToRgb(scheme.text);
  const border = hexToRgb(scheme.border);
  if (scheme.background !== stock.background) {
    vars["--workspace-canvas"] = scheme.background;
    vars["--background"] = hsl(mix(background, surface, 0.4));
    vars["--secondary"] = hsl(mix(background, text, 0.04));
    vars["--muted"] = hsl(mix(background, text, 0.05));
    vars["--accent"] = hsl(mix(background, text, 0.09));
  }
  if (scheme.surface !== stock.surface) {
    vars["--workspace-editor"] = scheme.surface;
    vars["--workspace-memo-list"] = rgbToHex(mix(surface, background, 0.35));
    vars["--card"] = hsl(mode === "light" ? mix(surface, WHITE, 0.6) : surface);
    vars["--popover"] = hsl(mode === "light" ? mix(surface, WHITE, 0.6) : mix(surface, WHITE, 0.03));
    vars["--tooltip-bg"] = rgbToHex(mode === "light" ? mix(surface, WHITE, 0.6) : mix(surface, WHITE, 0.07));
    vars["--dark-surface-rgb"] = channels(mode === "light" ? WHITE : surface);
  }
  if (scheme.sidebar !== stock.sidebar) vars["--workspace-sidebar"] = scheme.sidebar;
  if (scheme.text !== stock.text) {
    for (const name of ["--foreground", "--card-foreground", "--popover-foreground", "--secondary-foreground", "--accent-foreground"]) vars[name] = hsl(text);
    vars["--muted-foreground"] = hsl(mix(text, background, 0.42));
    vars["--tooltip-fg"] = rgbToHex(mix(text, background, 0.3));
    vars["--primary"] = hsl(text);
    vars["--primary-foreground"] = hsl(mode === "light" ? WHITE : background);
    vars["--ring"] = hsl(mix(text, background, 0.15));
  }
  if (scheme.border !== stock.border) {
    vars["--border"] = hsl(border);
    vars["--input"] = hsl(border);
    vars["--workspace-divider"] = scheme.border;
    vars["--workspace-memo-divider"] = rgbToHex(mix(border, text, 0.03));
    vars["--workspace-selection"] = rgbToHex(mix(border, text, 0.06));
    vars["--tooltip-border"] = scheme.border;
  }
  if (branding.fonts.body !== "system") vars["--brand-body-font"] = BRAND_FONTS[branding.fonts.body];
  if (branding.fonts.heading !== "system") vars["--brand-heading-font"] = BRAND_FONTS[branding.fonts.heading];
  return vars;
};

const declarations = (vars: Record<string, string>) => Object.entries(vars).map(([name, value]) => `${name}:${value}`).join(";");

/**
 * A stylesheet that follows the app's `.dark` class. The app shell, public
 * pages and server-rendered HTML all inject the same text.
 */
export const brandingStylesheet = (branding: ResolvedBranding): string => {
  const light = declarations(brandingCssVariables(branding, "light"));
  const dark = declarations(brandingCssVariables(branding, "dark"));
  const rules: string[] = [];
  if (light) rules.push(`:root{${light}}`);
  if (dark) rules.push(`:root.dark{${dark}}`);
  return rules.join("\n");
};

/** Theme colour for browser chrome: the light background, or the built-in colour. */
export const brandThemeColor = (branding: ResolvedBranding, mode: BrandColorMode = "light") => branding.colors[mode].background;

/** Resolves server-relative asset paths against a server origin, for clients not served from it. */
export const absolutizeBrandingUrls = (branding: ResolvedBranding, baseUrl: string | null | undefined): ResolvedBranding => {
  const base = baseUrl?.replace(/\/+$/, "");
  if (!base) return branding;
  const absolute = (url: string) => url.startsWith("/") ? `${base}${url}` : url;
  return { ...branding, logoUrl: absolute(branding.logoUrl), logoDarkUrl: absolute(branding.logoDarkUrl), faviconUrl: absolute(branding.faviconUrl) };
};

/** Replaces the product name in UI copy with the configured brand name. */
export const withBrandName = (text: string, name: string) => text.replaceAll(DEFAULT_BRAND_NAME, () => name);

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

export type BrandingProfileScope = "instance" | "workspace" | "notebook";

export type BrandingOverview = {
  instance: BrandingSettings;
  workspace: BrandingSettings;
  /** Instance default plus workspace: what the app shell shows. */
  effective: ResolvedBranding;
  /** Only the instance default: the sign-in page and new workspaces. */
  instanceEffective: ResolvedBranding;
  permissions: { instance: boolean; workspace: boolean };
  /** Notebooks in this workspace that have their own branding. */
  notebooks: Array<{ id: string; name: string }>;
};

export type NotebookBranding = {
  notebookId: string;
  settings: BrandingSettings;
  /** Instance, workspace and notebook levels combined. */
  effective: ResolvedBranding;
};

export type BrandAsset = { id: string; url: string; mimeType: BrandAssetMimeType; size: number };

export const BrandingUpdateSchema = z.object({ settings: BrandingSettingsSchema }).strict();
export type BrandingUpdate = z.infer<typeof BrandingUpdateSchema>;
