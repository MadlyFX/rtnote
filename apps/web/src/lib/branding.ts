import { useSyncExternalStore } from "react";
import {
  brandForeground as sharedBrandForeground,
  brandingStylesheet,
  brandThemeColor,
  coerceResolvedBranding,
  DEFAULT_RESOLVED_BRANDING,
  withBrandName,
  type BrandingOverview,
  type BrandingSettings,
  type ResolvedBranding,
} from "@edgeever/shared/branding";

/**
 * Branding comes from the server: the instance default before sign-in, the
 * workspace's afterwards, and the page's own on public links. The last value
 * is cached so the next start shows it before the network answers.
 */
export type BrandingPreference = ResolvedBranding;
export const DEFAULT_BRANDING: ResolvedBranding = DEFAULT_RESOLVED_BRANDING;
export const BRANDING_CACHE_KEY = "edgeever.branding.server";
/** Per-browser branding from before Phase 6; imported into the workspace once. */
export const LEGACY_BRANDING_STORAGE_KEY = "edgeever.branding";
const PUBLIC_BRANDING_SCRIPT_ID = "edgeever-public-branding";
const STYLE_ELEMENT_ID = "edgeever-branding";

type Listener = () => void;
const listeners = new Set<Listener>();
let current: ResolvedBranding | null = null;
/** Public pages show the page owner's branding and never write the app cache. */
let publicMode = false;

const readCache = (): ResolvedBranding => {
  try {
    const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
    return raw ? coerceResolvedBranding(JSON.parse(raw)) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
};

/** Branding the server rendered into a public page, if this is one. `undefined` means none was rendered. */
export const readRenderedPublicBranding = (): ResolvedBranding | null | undefined => {
  try {
    const element = typeof document !== "undefined" ? document.getElementById?.(PUBLIC_BRANDING_SCRIPT_ID) : null;
    if (!element?.textContent) return undefined;
    const parsed = JSON.parse(element.textContent) as { branding?: unknown };
    return parsed.branding ? coerceResolvedBranding(parsed.branding) : null;
  } catch {
    return undefined;
  }
};

const initial = (): ResolvedBranding => {
  const rendered = readRenderedPublicBranding();
  if (rendered !== undefined) {
    publicMode = true;
    return rendered ?? DEFAULT_BRANDING;
  }
  return readCache();
};

export const getBranding = (): ResolvedBranding => {
  if (!current) current = initial();
  return current;
};

const emit = () => {
  listeners.forEach(listener => listener());
};

const sameBranding = (a: ResolvedBranding, b: ResolvedBranding) => JSON.stringify(a) === JSON.stringify(b);

/** Shows server branding in the app shell and caches it for the next start. */
export const setAppBranding = (value: unknown) => {
  if (publicMode) return getBranding();
  const next = coerceResolvedBranding(value);
  try {
    window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(next));
  } catch {
    // The cache is only a startup shortcut; branding still applies this session.
  }
  if (!current || !sameBranding(current, next)) {
    current = next;
    emit();
  }
  return next;
};

/** Shows a public page owner's branding (null hides branding). Never cached. */
export const setPublicBranding = (value: ResolvedBranding | null | undefined) => {
  publicMode = true;
  const next = value ? coerceResolvedBranding(value) : DEFAULT_BRANDING;
  if (!current || !sameBranding(current, next)) {
    current = next;
    emit();
  }
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useBranding = (): ResolvedBranding => useSyncExternalStore(subscribe, getBranding, getBranding);

export const brandForeground = sharedBrandForeground;

export const withAppBrandName = (text: string, name = getBranding().name) => withBrandName(text, name);

export const replaceBrandTitle = (title: string, previousName: string, nextName: string): string => {
  if (title === previousName) return nextName;
  const environmentPrefix = title.match(/^\[(?:DEV|DEMO|LOCAL|LOCAL DEMO)\] /)?.[0];
  if (environmentPrefix && title.slice(environmentPrefix.length) === previousName) return environmentPrefix + nextName;
  const suffix = ` · ${previousName}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) + ` · ${nextName}` : title;
};

/** Applies branding to the document: title, favicon, theme colour and the colour tokens. */
export const installBrandingPreferences = () => {
  let previousName = DEFAULT_BRANDING.name;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const defaultFavicon = favicon?.getAttribute("href") || "/favicon.svg";
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const defaultTheme = theme?.content || "#0f172a";
  const apply = () => {
    const branding = getBranding();
    document.title = replaceBrandTitle(document.title, previousName, branding.name);
    previousName = branding.name;
    if (favicon) {
      favicon.href = branding.faviconUrl || defaultFavicon;
      favicon.removeAttribute("type");
    }
    if (theme) {
      const dark = document.documentElement.classList?.contains("dark") ?? false;
      theme.content = branding.isCustom ? brandThemeColor(branding, dark ? "dark" : "light") : defaultTheme;
    }
    const css = brandingStylesheet(branding);
    let style = document.getElementById?.(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!style && css && document.createElement) {
      style = document.createElement("style");
      style.id = STYLE_ELEMENT_ID;
      document.head.appendChild(style);
    }
    if (style && style.textContent !== css) style.textContent = css;
  };
  apply();
  const unsubscribe = subscribe(apply);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== BRANDING_CACHE_KEY || publicMode) return;
    const next = readCache();
    if (!current || !sameBranding(current, next)) {
      current = next;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
};

// ---------------------------------------------------------------------------
// Importing per-browser branding from before Phase 6
// ---------------------------------------------------------------------------

type LegacyBranding = { name?: unknown; color?: unknown; logoUrl?: unknown };

export const readLegacyBranding = (): LegacyBranding | null => {
  try {
    const raw = window.localStorage.getItem(LEGACY_BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as LegacyBranding;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
};

const LEGACY_DEFAULT_COLORS = new Set(["#1ba456", "#16a06e"]);

/** Turns legacy settings into a workspace profile. The logo is returned separately because it must be uploaded first. */
export const legacyBrandingToSettings = (legacy: LegacyBranding): { settings: BrandingSettings; logoDataUrl: string | null } => {
  const settings: BrandingSettings = {};
  const name = typeof legacy.name === "string" ? legacy.name.trim() : "";
  if (name && name !== DEFAULT_BRANDING.name) settings.name = name.slice(0, 48);
  const color = typeof legacy.color === "string" ? legacy.color.trim().toLowerCase() : "";
  if (/^#[0-9a-f]{6}$/.test(color) && !LEGACY_DEFAULT_COLORS.has(color)) settings.accent = color;
  const logo = typeof legacy.logoUrl === "string" ? legacy.logoUrl : "";
  return { settings, logoDataUrl: /^data:image\/(png|jpeg|webp);base64,/i.test(logo) ? logo : null };
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, data] = dataUrl.split(",", 2);
  const mime = /^data:([^;]+)/.exec(header ?? "")?.[1] ?? "image/png";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
};

type BrandingApi = {
  updateWorkspaceBranding: (settings: BrandingSettings) => Promise<BrandingOverview>;
  uploadBrandingAsset: (file: Blob, scope?: "instance" | "workspace") => Promise<{ asset: { id: string } }>;
};

/**
 * Moves branding saved in this browser into the workspace, once, when the
 * workspace has none of its own. Logos given as external URLs cannot be
 * stored as attachments and are dropped. Returns the new overview, or null
 * when nothing was imported.
 */
export const importLegacyBranding = async (overview: BrandingOverview, client: BrandingApi): Promise<BrandingOverview | null> => {
  const legacy = readLegacyBranding();
  if (!legacy) return null;
  const forget = () => {
    try { window.localStorage.removeItem(LEGACY_BRANDING_STORAGE_KEY); } catch { /* Nothing else to clean up. */ }
  };
  if (!overview.permissions.workspace) return null;
  if (Object.keys(overview.workspace).length) {
    forget();
    return null;
  }
  const { settings, logoDataUrl } = legacyBrandingToSettings(legacy);
  if (logoDataUrl) {
    try {
      const { asset } = await client.uploadBrandingAsset(dataUrlToBlob(logoDataUrl), "workspace");
      settings.logoAssetId = asset.id;
    } catch {
      // Keep the name and colour even if the old logo cannot be uploaded.
    }
  }
  if (!Object.keys(settings).length) {
    forget();
    return null;
  }
  const next = await client.updateWorkspaceBranding(settings);
  forget();
  return next;
};
