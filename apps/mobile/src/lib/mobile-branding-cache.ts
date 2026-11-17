import { coerceResolvedBranding, DEFAULT_RESOLVED_BRANDING, type ResolvedBranding } from "@edgeever/shared/branding";

export const MOBILE_BRANDING_CACHE_KEY = "edgeever.mobile.branding";
/** Foreground refreshes happen at most this often; sign-in and sign-out always refresh. */
export const MOBILE_BRANDING_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * The last branding the server returned. `instance` is the instance default
 * (sign-in screen); `workspace` is what the signed-in app shell shows and is
 * dropped on sign-out.
 */
export type MobileBrandingCache = {
  baseUrl: string;
  instance: ResolvedBranding;
  workspace: ResolvedBranding | null;
  fetchedAt: number;
};

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

/** Reads the stored cache. Anything malformed yields `null`, never a broken branding. */
export const parseMobileBrandingCache = (raw: string | null | undefined): MobileBrandingCache | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof MobileBrandingCache, unknown>> | null;
    if (!value || typeof value !== "object") return null;
    const baseUrl = typeof value.baseUrl === "string" ? normalizeBaseUrl(value.baseUrl) : "";
    if (!/^https?:\/\//i.test(baseUrl)) return null;
    return {
      baseUrl,
      instance: coerceResolvedBranding(value.instance),
      workspace: value.workspace ? coerceResolvedBranding(value.workspace) : null,
      fetchedAt: typeof value.fetchedAt === "number" && Number.isFinite(value.fetchedAt) ? value.fetchedAt : 0,
    };
  } catch {
    return null;
  }
};

export const serializeMobileBrandingCache = (cache: MobileBrandingCache) => JSON.stringify(cache);

/** The branding to show: the workspace's while signed in to the cached server, else the instance default. */
export const selectMobileBranding = (cache: MobileBrandingCache | null, sessionBaseUrl: string | null): ResolvedBranding => {
  if (!cache) return DEFAULT_RESOLVED_BRANDING;
  if (sessionBaseUrl === null) return cache.instance;
  if (normalizeBaseUrl(sessionBaseUrl) !== cache.baseUrl) return DEFAULT_RESOLVED_BRANDING;
  return cache.workspace ?? cache.instance;
};

/** Absolute logo URL for the theme, or "" for the built-in mark. */
export const resolveMobileBrandingLogoUri = (branding: ResolvedBranding, baseUrl: string | null, theme: "light" | "dark") => {
  const path = theme === "dark" ? branding.logoDarkUrl || branding.logoUrl : branding.logoUrl;
  if (!path) return "";
  if (/^https:\/\//i.test(path)) return path;
  if (!path.startsWith("/") || !baseUrl) return "";
  return `${normalizeBaseUrl(baseUrl)}${path}`;
};

export const shouldRefreshMobileBranding = (lastAttemptAt: number, now: number) =>
  now - lastAttemptAt >= MOBILE_BRANDING_REFRESH_INTERVAL_MS;
