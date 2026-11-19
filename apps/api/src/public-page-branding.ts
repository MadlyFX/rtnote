import {
  BRAND_FONTS,
  brandingStylesheet,
  brandThemeColor,
  DEFAULT_RESOLVED_BRANDING,
  type ResolvedBranding,
} from "@rtnote/shared/branding";
import { PUBLIC_PAGE_HEADERS } from "@rtnote/shared/public-page-headers";
import { loadInstanceBranding, resolveWorkspaceBranding } from "./branding-service";
import type { DatabaseAdapter } from "./storage-contract";

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
})[char]!);

/** Branding JSON the SPA reads before its first render, so public pages do not flash RTNote. */
export const PUBLIC_BRANDING_SCRIPT_ID = "rtnote-public-branding";

const jsonForScript = (value: unknown) => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

const fontRules = (branding: ResolvedBranding) => {
  const rules: string[] = [];
  if (branding.fonts.body !== "system") rules.push(`#rtnote-shared-note,.rtnote-public-page{font-family:${BRAND_FONTS[branding.fonts.body]}}`);
  if (branding.fonts.heading !== "system") rules.push(`#rtnote-shared-note h1,.rtnote-public-page :is(h1,h2,h3){font-family:${BRAND_FONTS[branding.fonts.heading]}}`);
  return rules.join("\n");
};

/**
 * Head markup for a branded public page: favicon, browser theme colour, the
 * colour stylesheet and the branding JSON. `null` branding means "show none"
 * and only marks the page as unbranded for the SPA.
 */
export const brandingHeadMarkup = (branding: ResolvedBranding | null) => {
  const applied = branding ?? DEFAULT_RESOLVED_BRANDING;
  const parts: string[] = [];
  if (applied.faviconUrl) parts.push(`<link rel="icon" href="${escapeHtml(applied.faviconUrl)}">`);
  if (applied.isCustom) {
    parts.push(`<meta name="theme-color" media="(prefers-color-scheme: light)" content="${brandThemeColor(applied, "light")}">`);
    parts.push(`<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${brandThemeColor(applied, "dark")}">`);
  }
  const css = [brandingStylesheet(applied), fontRules(applied)].filter(Boolean).join("\n");
  if (css) parts.push(`<style id="rtnote-branding">${css.replace(/<\//g, "<\\/")}</style>`);
  parts.push(`<script type="application/json" id="${PUBLIC_BRANDING_SCRIPT_ID}">${jsonForScript({ branding: branding ?? null })}</script>`);
  return parts.join("\n");
};

/** Removes shell tags that branding replaces. Only custom branding swaps the favicon or theme colour. */
export const stripBrandableHead = (html: string, branding: ResolvedBranding | null) => {
  let out = html;
  if (branding?.faviconUrl) out = out.replace(/<link\b[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/gi, "");
  if (branding?.isCustom) out = out.replace(/<meta\b[^>]*name=["']theme-color["'][^>]*>/gi, "");
  return out;
};

/** Footer for the no-JavaScript copy of a shared note: custom footer text and links, else "Published with <name>". */
export const brandFooterHtml = (branding: ResolvedBranding) => {
  const links = branding.footer.links.map(link =>
    `<a href="${escapeHtml(link.url)}" rel="noopener noreferrer" style="color:inherit">${escapeHtml(link.label)}</a>`);
  const text = branding.footer.text
    ? escapeHtml(branding.footer.text)
    : branding.isCustom
      ? `Published with ${escapeHtml(branding.name)}`
      : `<a href="https://github.com/MadlyFX/rtnote" style="color:inherit">Published with RTNote</a>`;
  return `<footer lang="en" style="margin-top:2rem;font-size:.75rem;text-align:center;color:#64748b">${[text, ...links].join(" · ")}</footer>`;
};

/** Title suffix: the brand name, or nothing when branding is hidden. */
export const brandedTitle = (title: string, branding: ResolvedBranding | null) =>
  branding ? `${title} · ${branding.name}` : title;

const rewriteHeaders = (template: Response) => {
  const headers = new Headers(template.headers);
  for (const name of ["Content-Length", "ETag", "Content-Encoding", "Last-Modified", "Age", "CF-Cache-Status"]) headers.delete(name);
  return headers;
};

const FORM_PAGE_PATH = /^\/form\/([A-Za-z0-9_-]{43})\/?$/;
export const isPublicFormPagePath = (pathname: string) => FORM_PAGE_PATH.test(pathname);

/**
 * Public form links get the owning workspace's branding in the first
 * response. The form itself still loads through its API.
 */
export const renderPublicFormPage = async (
  request: Request,
  db: DatabaseAdapter,
  loadTemplate: () => Promise<Response>,
): Promise<Response | null> => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const match = FORM_PAGE_PATH.exec(new URL(request.url).pathname);
  if (!match) return null;
  const form = await db.prepare(
    `SELECT workspace_id FROM table_forms WHERE token = ? AND enabled = 1 LIMIT 1`,
  ).bind(match[1]).first<{ workspace_id: string }>();
  const branding = form ? await resolveWorkspaceBranding(db, form.workspace_id) : await loadInstanceBranding(db);
  const template = await loadTemplate();
  if (!template.ok) return template;
  const html = stripBrandableHead(await template.text(), branding)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(branding.name)}</title>`)
    .replace(/<\/head>/i, () => `${brandingHeadMarkup(branding)}</head>`);
  const headers = rewriteHeaders(template);
  for (const [key, value] of Object.entries(PUBLIC_PAGE_HEADERS)) headers.set(key, value);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(request.method === "HEAD" ? null : html, { status: 200, headers });
};

export const isWebManifestPath = (pathname: string) => pathname === "/manifest.webmanifest";

type WebManifest = {
  name?: string;
  short_name?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes?: string; type?: string; purpose?: string }>;
  [key: string]: unknown;
};

const ICON_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

/**
 * The installable app uses the instance default branding: it is installed
 * before anyone signs in. The built manifest stays the base, so everything
 * else (start URL, scope, display mode) is unchanged.
 */
export const renderWebManifest = async (
  request: Request,
  db: DatabaseAdapter,
  loadStatic: () => Promise<Response>,
): Promise<Response | null> => {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isWebManifestPath(new URL(request.url).pathname)) return null;
  const base = await loadStatic();
  if (!base.ok) return base;
  let manifest: WebManifest;
  try {
    manifest = await base.json() as WebManifest;
  } catch {
    return new Response("Manifest unavailable", { status: 503 });
  }
  const branding = await loadInstanceBranding(db);
  if (branding.isCustom) {
    manifest.name = branding.name;
    manifest.short_name = branding.name.length > 12 ? branding.name.slice(0, 12).trim() : branding.name;
    manifest.theme_color = branding.colors.light.accent;
    manifest.background_color = branding.colors.light.background;
    const icon = branding.faviconUrl || branding.logoUrl;
    if (icon) {
      const extension = /\.[a-z]+$/.exec(icon)?.[0] ?? "";
      const type = ICON_TYPES[extension];
      // The uploaded image is listed first; the built-in sizes stay as a
      // fallback for platforms that require 192 and 512 pixel icons.
      manifest.icons = [{ src: icon, sizes: "any", ...(type ? { type } : {}), purpose: "any" }, ...(manifest.icons ?? [])];
    }
  }
  const headers = new Headers({
    "Content-Type": "application/manifest+json; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  });
  return new Response(request.method === "HEAD" ? null : JSON.stringify(manifest), { status: 200, headers });
};
