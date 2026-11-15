import { CATALOG_FONT_STACKS, type RemoteNoteImageFont } from "./font-catalog";
export { prepareNoteImageContent } from "./note-image-content";

export type NoteImageFormat = "jpeg" | "png";
export const NOTE_IMAGE_THEME_OPTIONS = ["glass", "quote", "book", "memo", "bento", "black-sun", "frame", "handwritten", "code"] as const;
export type NoteImageActiveTheme = (typeof NOTE_IMAGE_THEME_OPTIONS)[number];
type LegacyNoteImageTheme = "gradient" | "paper" | "press" | "highlight" | "slate" | "aurora" | "sunset" | "midnight" | "editorial" | "terminal" | "film" | "mint" | "lavender";
export type NoteImageTheme = NoteImageActiveTheme | LegacyNoteImageTheme;
export type NoteImageBackground = NoteImageTheme | "warm" | "notepad" | "xuan" | "polaroid";
export type NoteImageFontStyle = "auto" | "sans" | "serif" | "mono" | "kai" | RemoteNoteImageFont;
export type NoteImageFontSize = "sm" | "md" | "lg";
export type NoteImageCardWidth = "compact" | "standard" | "wide";
export const NOTE_IMAGE_EXPORT_WIDTH = 768;
export const NOTE_IMAGE_EXPORT_PIXEL_RATIO = 2;
export const NOTE_IMAGE_CARD_WIDTH_PIXELS: Record<NoteImageCardWidth, number> = { compact: 560, standard: 680, wide: 800 };

/** Bound a complete note card to dimensions that native WebViews can rasterize. */
export const planNativeNoteImageRender = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid note image dimensions");
  }

  const sourceScale = Math.min(1, 15_000 / height);
  if (sourceScale < 0.5) throw new Error("NOTE_IMAGE_TOO_LONG");

  const sourceWidth = Math.max(1, Math.floor(width * sourceScale));
  const sourceHeight = Math.max(1, Math.floor(height * sourceScale));
  const pixelRatio = Math.min(
    2,
    15_000 / sourceHeight,
    Math.sqrt(12_000_000 / (sourceWidth * sourceHeight)),
  );

  return { pixelRatio, sourceHeight, sourceScale, sourceWidth };
};

const LEGACY_THEMES: Record<Exclude<NoteImageBackground, NoteImageActiveTheme>, NoteImageActiveTheme> = {
  paper: "handwritten", press: "book", highlight: "memo", slate: "frame", aurora: "glass", gradient: "glass",
  sunset: "glass", midnight: "black-sun", editorial: "frame", terminal: "code", film: "book",
  mint: "quote", lavender: "glass", warm: "glass", notepad: "memo", xuan: "handwritten", polaroid: "frame",
};

export const resolveTheme = (background?: NoteImageBackground, theme?: NoteImageTheme): NoteImageActiveTheme => {
  for (const candidate of [theme, background]) {
    if (!candidate) continue;
    if ((NOTE_IMAGE_THEME_OPTIONS as readonly string[]).includes(candidate)) return candidate as NoteImageActiveTheme;
    if (Object.hasOwn(LEGACY_THEMES, candidate)) return LEGACY_THEMES[candidate as keyof typeof LEGACY_THEMES];
  }
  return "glass";
};

export type ThemeStyleConfig = {
  canvasBg: string; cardBg: string; cardBorder: string; cardShadow: string;
  textColor: string; headingColor: string; metaColor: string; metaBg: string; metaBorder: string;
  accentColor: string; accentSubtle: string; linkBg: string; dividerColor: string;
  codeBg: string; codeBorder: string; codeColor: string; quoteBg: string; quoteBorder: string;
  tableThBg: string; tableBorder: string; brandText: string; brandMark: string; isDark?: boolean;
};

const palette = (base: Pick<ThemeStyleConfig, "canvasBg" | "cardBg" | "textColor"> & Partial<ThemeStyleConfig>): ThemeStyleConfig => {
  const line = base.isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const subtle = base.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)";
  return {
    cardBorder: "none", cardShadow: "none", headingColor: base.textColor,
    metaColor: base.isDark ? "#999ba3" : "#737373", metaBg: subtle, metaBorder: line,
    accentColor: base.textColor, accentSubtle: line, linkBg: "transparent", dividerColor: line,
    codeBg: subtle, codeBorder: line, codeColor: base.textColor, quoteBg: "transparent", quoteBorder: line,
    tableThBg: subtle, tableBorder: line, brandText: base.textColor, brandMark: base.textColor,
    ...base,
  };
};

// Measured against the public Firefly Card templates at their 400px / 440px design widths.
// Structure and CSS are implemented here; exports never depend on that service.
const ACTIVE_THEMES: Record<NoteImageActiveTheme, ThemeStyleConfig> = {
  glass: palette({ canvasBg: "linear-gradient(45deg, #5797f9, #6cd5c4)", cardBg: "rgba(255,255,255,0.7)", textColor: "#000000", cardShadow: "0 5px 10px rgba(99,99,99,0.2), 0 15px 15px rgba(99,99,99,0.2)" }),
  quote: palette({ canvasBg: "#ffffff", cardBg: "transparent", textColor: "#0a7c07", metaColor: "#497447", accentColor: "#0a7c07" }),
  book: palette({ canvasBg: "#f8f3e8", cardBg: "transparent", textColor: "#302b24", metaColor: "#786c5c", accentColor: "#66513a" }),
  memo: palette({ canvasBg: "#ffffff", cardBg: "#ffffff", textColor: "#353535", metaColor: "#737377", accentColor: "#e5ae00" }),
  bento: palette({ canvasBg: "linear-gradient(45deg, #5797f9, #6cd5c4)", cardBg: "#f5f4f7", textColor: "#000000", headingColor: "#5797f9", cardShadow: "0 6px 18px rgba(0,0,0,0.15), 0 21px 68px rgba(0,0,0,0.1)" }),
  "black-sun": palette({ canvasBg: "#101010", cardBg: "#020410", textColor: "#ffffff", metaColor: "#9392a4", cardBorder: "1px solid #777681", cardShadow: "0 0 22px rgba(216,213,255,0.65)", isDark: true }),
  frame: palette({ canvasBg: "#ffffff", cardBg: "#ffffff", textColor: "#000000", cardBorder: "2px solid #000000", cardShadow: "7px 7px 0 #000000" }),
  handwritten: palette({ canvasBg: "#e3dfd4", cardBg: "transparent", textColor: "#000000", metaColor: "#000000", accentColor: "#000000" }),
  code: palette({ canvasBg: "linear-gradient(45deg, #5797f9, #6cd5c4)", cardBg: "#151718", textColor: "#d4d4d4", headingColor: "#f1f1f1", metaColor: "#949898", codeBg: "#151718", isDark: true }),
};

export const NOTE_IMAGE_THEMES: Record<NoteImageTheme, ThemeStyleConfig> = {
  ...ACTIVE_THEMES,
  ...Object.fromEntries(Object.entries(LEGACY_THEMES).map(([legacy, active]) => [legacy, ACTIVE_THEMES[active]])),
} as Record<NoteImageTheme, ThemeStyleConfig>;

const CANVAS_COLORS: Record<NoteImageActiveTheme, string> = {
  glass: "#5797f9", quote: "#ffffff", book: "#f8f3e8", memo: "#ffffff",
  bento: "#5797f9", "black-sun": "#101010", frame: "#ffffff", handwritten: "#e3dfd4", code: "#5797f9",
};
export const NOTE_IMAGE_BACKGROUND_COLORS = {
  ...CANVAS_COLORS,
  ...Object.fromEntries(Object.entries(LEGACY_THEMES).map(([legacy, active]) => [legacy, CANVAS_COLORS[active]])),
} as Record<NoteImageBackground, string>;

export const NOTE_IMAGE_FONT_FAMILIES: Record<Exclude<NoteImageFontStyle, "auto">, string> = {
  sans: '"RTNote Offline Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  serif: 'Georgia, "Nimbus Roman No9 L", "Songti SC", "Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN", "STSong", "AR PL New Sung", "SimSun", "Hiragino Mincho ProN", "RTNote Offline Sans", serif',
  mono: '"Geist Mono Variable", "JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  kai: '"LXGW WenKai", "霞鹜文楷", "Kaiti SC", "STKaiti", "KaiTi", "KaiTi_GB2312", "BiauKai", "楷体", "STFangsong", "FangSong", "RTNote Offline Sans", serif',
  ...CATALOG_FONT_STACKS,
};

/** Keep CSS families and asset selection together so defaults cannot silently fall back. */
export const NOTE_IMAGE_BUNDLED_FONTS = {
  puhui: { labelKey: "editor.imageShare.templateFonts.puhui", family: "Alibaba-PuHuiTi-Regular", fallback: "sans" },
  misans: { labelKey: "editor.imageShare.templateFonts.misans", family: "MiSans", fallback: "sans" },
  mincho: { labelKey: "editor.imageShare.templateFonts.mincho", family: "Huiwen_mingchao", fallback: "serif" },
  song: { labelKey: "editor.imageShare.templateFonts.song", family: "SourceHanSerifCN_SemiBold", fallback: "serif" },
  longcang: { labelKey: "editor.imageShare.templateFonts.longcang", family: "Long Cang", fallback: "kai" },
  geist: { labelKey: "editor.imageShare.templateFonts.geist", family: "Geist Mono Variable", fallback: "mono" },
} as const;

type BundledNoteImageFont = keyof typeof NOTE_IMAGE_BUNDLED_FONTS;
type TemplateTypography = {
  body: readonly BundledNoteImageFont[];
  heading: readonly BundledNoteImageFont[];
  headingWeight: number;
};

export const NOTE_IMAGE_TEMPLATE_TYPOGRAPHY = {
  glass: { body: ["misans"], heading: ["mincho"], headingWeight: 400 },
  quote: { body: ["mincho"], heading: ["mincho"], headingWeight: 700 },
  book: { body: ["song"], heading: ["song"], headingWeight: 700 },
  memo: { body: ["misans"], heading: ["misans"], headingWeight: 700 },
  bento: { body: ["misans"], heading: ["song"], headingWeight: 600 },
  "black-sun": { body: ["geist", "misans"], heading: ["geist", "misans"], headingWeight: 700 },
  frame: { body: ["song"], heading: ["song"], headingWeight: 600 },
  handwritten: { body: ["longcang"], heading: ["longcang"], headingWeight: 400 },
  code: { body: ["geist"], heading: ["geist"], headingWeight: 700 },
} as const satisfies Record<NoteImageActiveTheme, TemplateTypography>;

const templateFontStack = (fonts: readonly BundledNoteImageFont[]) => [
  ...fonts.map(font => `"${NOTE_IMAGE_BUNDLED_FONTS[font].family}"`),
  NOTE_IMAGE_FONT_FAMILIES[NOTE_IMAGE_BUNDLED_FONTS[fonts[0]].fallback],
].join(", ");

export const resolveNoteImageTypography = (theme: NoteImageTheme, fontStyle: NoteImageFontStyle = "auto") => {
  const active = resolveTheme(undefined, theme);
  const preset = NOTE_IMAGE_TEMPLATE_TYPOGRAPHY[active];
  return {
    bodyFamily: fontStyle === "auto" ? templateFontStack(preset.body) : NOTE_IMAGE_FONT_FAMILIES[fontStyle],
    headingFamily: fontStyle === "auto" ? templateFontStack(preset.heading) : NOTE_IMAGE_FONT_FAMILIES[fontStyle],
    headingWeight: fontStyle === "auto" ? preset.headingWeight : active === "handwritten" ? 400 : 700,
    lineHeightAdjustment: 0,
  };
};

export const NOTE_IMAGE_FONT_SIZES = {
  sm: { base: "14.4px", lineHeight: "1.8", title: "18.4px", h1: "19px", h2: "17px", h3: "16px", h4: "15px", h5: "14.4px", h6: "14.4px", meta: "11.5px", code: "12px" },
  md: { base: "16px", lineHeight: "1.8", title: "20.4px", h1: "21px", h2: "19px", h3: "18px", h4: "17px", h5: "16px", h6: "16px", meta: "12.7px", code: "13.5px" },
  lg: { base: "17.6px", lineHeight: "1.8", title: "22.4px", h1: "23px", h2: "21px", h3: "19px", h4: "18px", h5: "17.6px", h6: "17.6px", meta: "14px", code: "15px" },
} satisfies Record<NoteImageFontSize, Record<string, string>>;

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export const buildImageExportBasename = (title: string, fallback: string) => {
  const sanitized = title
    // oxlint-disable-next-line no-control-regex -- replaces control characters in export filenames
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
  const basename = sanitized || fallback;
  return WINDOWS_RESERVED_NAME.test(basename) ? `_${basename}` : basename;
};

export const escapeCardHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const estimateReadingStats = (html: string) => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const cjkChars = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const nonCjkText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, " ").trim();
  const words = nonCjkText ? nonCjkText.split(/\s+/).filter(Boolean).length : 0;
  const totalCount = cjkChars + words;
  const minutes = Math.max(1, Math.ceil(totalCount / 350));
  return { minutes, totalCount };
};

export type NoteImageCardMarkupOptions = {
  title: string; notebook?: string; tags?: string[]; updatedAt?: string; bodyHtml: string;
  theme?: NoteImageTheme; fontStyle?: NoteImageFontStyle; showTitle?: boolean; showNotebook?: boolean;
  showTags?: boolean; showUpdatedAt?: boolean; showBranding?: boolean; author?: string;
  showAuthor?: boolean; showReadingTime?: boolean; readingTimeText?: string;
};

export const buildNoteImageCardMarkup = ({
  title, notebook = "", tags = [], updatedAt = "", bodyHtml, theme = "glass",
  showTitle = false, showNotebook = false, showTags = false, showUpdatedAt = true,
  showBranding = true, author = "", showAuthor = false, showReadingTime = false, readingTimeText = "",
}: NoteImageCardMarkupOptions) => {
  const active = resolveTheme(undefined, theme);
  const hasTitle = showTitle && Boolean(title.trim());
  const hasAuthor = showAuthor && Boolean(author.trim());
  const authorName = hasAuthor ? escapeCardHtml(author.trim()) : "";
  const meta: string[] = [];
  const dateHtml = showUpdatedAt && updatedAt.trim() ? `<div class="edgeever-card-date"><span class="edgeever-meta-date">${escapeCardHtml(updatedAt)}</span></div>` : "";
  if (showNotebook && notebook.trim()) meta.push(`<span class="edgeever-meta-notebook">${escapeCardHtml(notebook)}</span>`);
  if (showTags) meta.push(...tags.filter(tag => tag.trim()).map(tag => `<span class="edgeever-meta-tag">#${escapeCardHtml(tag)}</span>`));
  if (showReadingTime) {
    const stats = estimateReadingStats(bodyHtml);
    meta.push(`<span class="edgeever-meta-reading">${escapeCardHtml(readingTimeText || `${stats.minutes} min · ${stats.totalCount} words`)}</span>`);
  }
  const metaHtml = meta.length ? `<div class="edgeever-card-meta">${meta.join("")}</div>` : "";
  const titleHtml = hasTitle ? `<h1 class="edgeever-card-title">${escapeCardHtml(title)}</h1>` : "";
  const dots = `<span class="edgeever-window-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
  const chrome = active === "code"
    ? `<div class="edgeever-terminal-header">${dots}<span class="edgeever-terminal-name">note.md</span></div>`
    : active === "memo"
    ? `<div class="edgeever-memo-toolbar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg><span></span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7 12h.01M12 12h.01M17 12h.01"/></svg><svg viewBox="0 0 24 24"><path d="M12 16V2m-5 5 5-5 5 5M5 10v11h14V10"/></svg></div>`
    : active === "frame" ? `<div class="edgeever-frame-toolbar">${dots}</div>` : "";
  const brandBadgeHtml = `<div class="edgeever-brand-badge">
        <svg class="edgeever-brand-logo" viewBox="0 0 1024 1024" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <rect x="100" y="100" width="824" height="824" rx="188" fill="#16a06e" />
          <path fill="#07130b" fill-rule="evenodd" d="M340 236H588L724 372V748Q724 788 684 788H340Q300 788 300 748V276Q300 236 340 236ZM412 344H560A40 40 0 0 1 560 424H412A40 40 0 0 1 412 344ZM400 496H624A28 28 0 0 1 624 552H400A28 28 0 0 1 400 496ZM400 624H532A28 28 0 0 1 532 680H400A28 28 0 0 1 400 624Z" />
        </svg>
        <span class="edgeever-brand-name">RTNote</span>
      </div>`;
  const footer = hasAuthor || showBranding || meta.length ? `<footer class="edgeever-card-footer">
    ${metaHtml}
    ${hasAuthor ? `<div class="edgeever-footer-author"><span>${authorName}</span></div>` : ""}
    ${showBranding ? brandBadgeHtml : ""}
  </footer>` : "";
  // Only a standalone short paragraph gets the large quotation treatment.
  // Long excerpts, hard breaks and rich blocks keep the regular reading size.
  const quoteParagraph = bodyHtml.trim().match(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>$/i)?.[1];
  const quoteText = quoteParagraph?.replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160|#xa0);/gi, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, "x").trim() || "";
  const shortQuote = active === "quote" && !hasTitle && Boolean(quoteText) && Array.from(quoteText).length <= 60
    && !/<\/?(?:p|br|img|svg|video|iframe|math)\b/i.test(quoteParagraph || "");
  const header = titleHtml || dateHtml ? `<header class="edgeever-card-header">${titleHtml}${dateHtml}</header>` : "";
  return `<div class="edgeever-image-wrapper" data-theme="${active}" data-has-title="${hasTitle}" data-short-quote="${shortQuote}">
    <article class="edgeever-image-card">
      ${chrome}
      ${header}
      <div class="edgeever-card-body">${bodyHtml}</div>
      ${footer}
    </article>
  </div>`;
};

export const generateCardCss = ({ theme = "glass", fontStyle = "auto", fontSize = "lg", cardWidth = "wide" }: {
  theme: NoteImageTheme; fontStyle: NoteImageFontStyle; fontSize: NoteImageFontSize; cardWidth: NoteImageCardWidth;
}) => {
  const active = resolveTheme(undefined, theme);
  const cfg = NOTE_IMAGE_THEMES[active];
  const typography = resolveNoteImageTypography(active, fontStyle);
  const size = NOTE_IMAGE_FONT_SIZES[fontSize] || NOTE_IMAGE_FONT_SIZES.lg;
  const width = NOTE_IMAGE_CARD_WIDTH_PIXELS[cardWidth] || 800;
  const scale = width / (["handwritten", "quote"].includes(active) ? 400 : 440);
  const px = (n: number) => `${Number((n * scale).toFixed(3))}px`;
  const scaledCss = (value: string) => value.replace(/([\d.]+)px/g, (_, n: string) => px(Number(n)));
  const textScale = parseFloat(size.base) / 17.6;
  const bodySize = active === "book" ? 20 : active === "code" ? 15 : active === "quote" ? 14.4 : 17.6;
  // Keep the note title above every heading in its body, across font-size choices.
  const titleSize = active === "quote" ? 28.8 : active === "memo" ? 32 : bodySize * 1.6;
  const inset = ["book", "quote", "memo", "handwritten"].includes(active) ? 0 : 30;
  const padding = active === "handwritten" ? "50px" : active === "bento" ? "14px" : active === "frame" ? "16px" : active === "code" ? "16px" : active === "memo" ? "0px 32px 32px" : active === "book" || active === "quote" ? "30px" : "32px 28px";
  const scaledPadding = padding.replace(/([\d.]+)px/g, (_, n: string) => px(Number(n)));
  const radius = ["book", "quote", "memo", "handwritten"].includes(active) ? 0 : active === "code" ? 5 : active === "frame" ? 12 : 15;
  return `
.edgeever-image-wrapper[data-theme="${active}"] {
  --ee-canvas-bg: ${cfg.canvasBg}; --ee-card-bg: ${cfg.cardBg}; --ee-card-border: ${scaledCss(cfg.cardBorder)};
  --ee-text: ${cfg.textColor}; --ee-heading: ${cfg.headingColor}; --ee-meta: ${cfg.metaColor};
  --ee-line: ${cfg.dividerColor}; --ee-accent: ${cfg.accentColor}; --ee-code-bg: ${cfg.codeBg};
  --ee-quote-bg: ${cfg.quoteBg}; --ee-quote-border: ${cfg.quoteBorder};
  --ee-unit: ${px(1)}; --ee-body-size: ${px(bodySize * textScale)};
  --ee-meta-size: ${px(Math.min(bodySize * 0.78, 13) * textScale)}; --ee-title-size: ${px(titleSize * textScale)};
  width: ${width}px; padding: ${px(inset)}; margin: 0; background: var(--ee-canvas-bg);
  color: var(--ee-text); font-family: ${typography.bodyFamily}; font-size: var(--ee-body-size);
  line-height: ${active === "quote" ? 1.6 : active === "black-sun" ? 1.7 : 1.8}; -webkit-font-smoothing: antialiased;
  font-feature-settings: "chws" 1; overflow: hidden; position: relative; isolation: isolate;
}
.edgeever-image-wrapper, .edgeever-image-wrapper * { box-sizing: border-box; }
.edgeever-image-card {
  position: relative; padding: ${scaledPadding}; border-radius: ${px(radius)};
  background: var(--ee-card-bg); border: var(--ee-card-border); box-shadow: ${scaledCss(cfg.cardShadow)};
  min-width: 0; overflow: hidden;
}
.edgeever-card-header:empty { display: none; }
.edgeever-card-date,
.edgeever-card-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: ${px(4)} ${px(12)};
  color: var(--ee-meta); font-size: var(--ee-meta-size); font-weight: 400; line-height: 1.5; margin: 0;
  overflow-wrap: anywhere;
}
.edgeever-card-date { margin-bottom: ${px(16)}; }
.edgeever-card-title {
  margin: 0 0 ${px(12)}; padding: 0; color: var(--ee-heading); font-family: ${typography.headingFamily};
  font-size: var(--ee-title-size); font-weight: ${typography.headingWeight}; line-height: 1.35;
  letter-spacing: 0; overflow-wrap: anywhere;
}
.edgeever-card-body { white-space: normal; color: var(--ee-text); font-size: var(--ee-body-size); line-height: inherit; overflow-wrap: anywhere; }
.edgeever-card-body > :first-child { margin-top: 0; }
.edgeever-card-body > :last-child { margin-bottom: 0; }
.edgeever-card-body p { margin: 0; white-space: pre-wrap; }
.edgeever-card-body p + p, .edgeever-card-body p + ul, .edgeever-card-body p + ol { margin-top: 0.7em; }
/* Existing empty paragraphs already provide a blank line. Do not add another gap. */
.edgeever-card-body p:empty, .edgeever-card-body p:has(> br:only-child),
.edgeever-card-body p:empty + p, .edgeever-card-body p:has(> br:only-child) + p { margin-top: 0; }
.edgeever-card-body b, .edgeever-card-body strong { margin: 0 .1em; }
.edgeever-card-body h1, .edgeever-card-body h2, .edgeever-card-body h3,
.edgeever-card-body h4, .edgeever-card-body h5, .edgeever-card-body h6 {
  color: var(--ee-heading); font-family: ${typography.headingFamily}; font-weight: ${typography.headingWeight};
  line-height: 1.5; padding: 0; margin: 1.2em 0 0.5em; overflow-wrap: anywhere;
}
.edgeever-card-body h1 { font-size: 1.3em; }
.edgeever-card-body h2 { font-size: 1.2em; }
.edgeever-card-body h3 { font-size: 1.1em; }
.edgeever-card-body h4, .edgeever-card-body h5, .edgeever-card-body h6 { font-size: 1em; }
.edgeever-card-body ul, .edgeever-card-body ol { margin: 0 0 0.75em; padding-left: 1.35em; }
.edgeever-card-body ul { list-style: disc; }
.edgeever-card-body ol { list-style: decimal; }
.edgeever-card-body ul ul { list-style: circle; }
.edgeever-card-body li { margin: 0.2em 0; }
.edgeever-card-body li > ul, .edgeever-card-body li > ol { margin: 0.35em 0 0; padding-left: 1.2em; }
.edgeever-card-body li > p { margin-bottom: 0; }
.edgeever-card-body ul[data-type="taskList"] { list-style: none; padding: 0; }
.edgeever-card-body ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5em; }
.edgeever-card-body ul[data-type="taskList"] label { display: inline-flex; flex-shrink: 0; padding-top: 0.4em; }
.edgeever-card-body ul[data-type="taskList"] input { width: 0.85em; height: 0.85em; margin: 0; accent-color: var(--ee-accent); }
.edgeever-card-body ul[data-type="taskList"] li > div { min-width: 0; }
.edgeever-card-body ul[data-type="taskList"] li[data-checked="true"] > div { opacity: 0.6; text-decoration: line-through; }
.edgeever-card-body blockquote {
  margin: 1em 0; padding: 0.1em 0 0.1em 0.9em; border-left: ${px(2)} solid var(--ee-quote-border);
  background: var(--ee-quote-bg); color: inherit;
}
.edgeever-card-body blockquote > :last-child { margin-bottom: 0; }
.edgeever-card-body blockquote > :first-child { margin-top: 0; }
.edgeever-card-body blockquote blockquote { margin: 0.65em 0; padding-left: 0.7em; }
.edgeever-card-body a { color: var(--ee-accent); text-decoration: underline; text-underline-offset: 0.15em; overflow-wrap: anywhere; }
.edgeever-card-body mark { background: ${cfg.isDark ? "rgba(255,225,132,0.2)" : "#fff0a8"}; color: inherit; padding: 0.05em 0.1em; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.edgeever-card-body code { background: var(--ee-code-bg); border-radius: ${px(3)}; padding: 0.1em 0.25em; color: inherit; font-family: ${NOTE_IMAGE_FONT_FAMILIES.mono}; font-size: 0.85em; white-space: pre-wrap; }
.edgeever-card-body pre, .edgeever-card-body .edgeever-code-source {
  max-width: 100%; padding: 0.8em; border: 1px solid var(--ee-line); border-radius: ${px(5)};
  margin: 1em 0; background: var(--ee-code-bg); color: inherit; white-space: pre-wrap;
  overflow-wrap: anywhere; font-family: ${NOTE_IMAGE_FONT_FAMILIES.mono}; font-size: 0.85em; line-height: 1.6;
}
.edgeever-card-body pre code { padding: 0; border: 0; background: transparent; font-size: inherit; }
.edgeever-card-body pre *, .edgeever-card-body .edgeever-code-source * { white-space: inherit !important; overflow-wrap: anywhere; }
.edgeever-card-body pre, .edgeever-card-body .edgeever-code-source { tab-size: 4; min-width: 0; }
.edgeever-card-body hr { margin: 1.4em 0; border: 0; border-top: 1px solid var(--ee-line); }
.edgeever-card-body img, .edgeever-card-body .edgeever-html-mermaid svg {
  display: block; max-width: 100%; height: auto; max-height: none; margin: 1em auto; border-radius: ${px(4)};
}
.edgeever-card-body figure, .edgeever-card-body .edgeever-html-mermaid { max-width: 100%; margin: 1em 0; }
.edgeever-card-body .edgeever-image-node, .edgeever-card-body .tableWrapper { min-width: 0; max-width: 100%; height: auto !important; max-height: none !important; overflow: visible !important; }
.edgeever-card-body img { width: auto !important; height: auto !important; min-height: 0 !important; max-height: ${px(480)} !important; object-fit: contain !important; }
.edgeever-card-body [data-edgeever-image-gallery] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 0.6em; margin: 1em 0; }
.edgeever-card-body [data-edgeever-image-gallery][data-image-gallery-layout="1"] { grid-template-columns: minmax(0, 1fr); }
.edgeever-card-body [data-edgeever-image-gallery][data-image-gallery-layout="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.edgeever-card-body [data-edgeever-image-gallery] > *, .edgeever-card-body [data-edgeever-image-gallery] img { margin: 0; min-width: 0; min-height: 0 !important; height: auto !important; background: transparent; }
.edgeever-card-body figcaption { margin-top: 0.5em; color: var(--ee-meta); font-size: 0.78em; line-height: 1.5; text-align: center; }
.edgeever-card-body table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 1em 0; font-size: 0.85em; line-height: 1.5; }
.edgeever-card-body th, .edgeever-card-body td { border: 1px solid var(--ee-line); text-align: left; vertical-align: top; padding: 0.5em; overflow-wrap: anywhere; }
.edgeever-card-body th { background: ${cfg.tableThBg}; font-weight: 600; }
.edgeever-card-body table[data-edgeever-export-table="stacked"],
.edgeever-card-body table[data-edgeever-export-table="stacked"] > thead,
.edgeever-card-body table[data-edgeever-export-table="stacked"] > tbody { display: block; width: 100%; }
.edgeever-card-body [data-edgeever-export-header] { display: none !important; }
.edgeever-card-body table[data-edgeever-export-table="stacked"] tr { display: block; margin: 0 0 0.75em; padding: 0.5em; border: 1px solid var(--ee-line); border-radius: ${px(5)}; }
.edgeever-card-body table[data-edgeever-export-table="stacked"] td,
.edgeever-card-body table[data-edgeever-export-table="stacked"] th { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 0.75em; padding: 0.5em; border: 0; background: transparent; font-weight: 400; }
.edgeever-card-body .edgeever-table-label { color: var(--ee-meta); font-weight: 600; }
.edgeever-card-body .edgeever-table-value { min-width: 0; }
.edgeever-card-body [data-edgeever-theme-block] { border-left: ${px(2)} solid var(--ee-accent); background: ${cfg.metaBg}; padding: 0.8em; margin: 1em 0; }
.edgeever-card-body .edgeever-image-panel, .edgeever-card-body .edgeever-image-controls, .edgeever-card-body .edgeever-code-copy-button,
.edgeever-card-body .edgeever-theme-block__toolbar, .edgeever-card-body .edgeever-mermaid-source { display: none !important; }
.edgeever-card-footer { display: flex; flex-direction: column; gap: ${px(12)}; margin-top: ${px(24)}; color: var(--ee-meta); font-size: var(--ee-meta-size); }
.edgeever-footer-author { display: flex; align-items: center; gap: ${px(8)}; min-width: 0; overflow-wrap: anywhere; }
.edgeever-footer-author > span { min-width: 0; }
.edgeever-brand-badge {
  display: flex; align-items: center; gap: ${px(7)}; border-top: 1px solid var(--ee-line);
  padding-top: ${px(12)}; color: var(--ee-meta); font-family: ${NOTE_IMAGE_FONT_FAMILIES.sans};
  font-size: ${px(12)}; font-weight: 500;
}
.edgeever-brand-logo { opacity: 1; width: ${px(18)}; height: ${px(18)}; flex-shrink: 0; }
.edgeever-window-dots { display: inline-flex; gap: ${px(6)}; align-items: center; flex-shrink: 0; }
.edgeever-window-dots i { display: block; width: ${px(12)}; height: ${px(12)}; border-radius: 50%; background: #ed6a5e; }
.edgeever-window-dots i:nth-child(2) { background: #f4bf4f; }
.edgeever-window-dots i:nth-child(3) { background: #61c554; }
${active === "book" ? `
.edgeever-image-wrapper {
  background-image: linear-gradient(90deg, rgba(101,77,43,0.09), transparent 6%, transparent 96%, rgba(101,77,43,0.04));
}
.edgeever-image-wrapper::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--ee-paper) repeat center / ${px(320)}; opacity: 0.045; z-index: 0;
}
.edgeever-image-card { min-height: 0; z-index: 1; }
.edgeever-card-body { font-weight: 400; letter-spacing: ${px(1)}; }
.edgeever-card-date { margin-bottom: ${px(20)}; }
.edgeever-card-title { font-weight: 700; line-height: 1.4; margin-bottom: ${px(14)}; }
.edgeever-card-header { display: flex; flex-direction: column; }
.edgeever-footer-author { line-height: 1.6; }
` : ""}
${active === "quote" ? `
.edgeever-card-title { font-size: ${px(28.8 * textScale)}; font-weight: 700; line-height: 1.6; margin-top: ${px(8)}; margin-bottom: ${px(4)}; }
.edgeever-card-body { font-weight: 400; }
.edgeever-card-footer { margin-top: ${px(20)}; }
.edgeever-image-wrapper[data-short-quote="true"] .edgeever-card-body > p:only-child { font-size: 2em; font-weight: 700; line-height: 1.6; }
.edgeever-footer-author { justify-content: flex-end; font-weight: 400; }
.edgeever-card-meta { justify-content: flex-end; }
.edgeever-brand-badge { justify-content: flex-end; border: 0; }
` : ""}
${active === "memo" ? `
.edgeever-memo-toolbar { display: flex; align-items: center; gap: ${px(16)}; margin: 0 -${px(12)}; padding: ${px(16)} 0 ${px(6)}; color: #e5ae00; }
.edgeever-memo-toolbar span { flex: 1; }
.edgeever-memo-toolbar svg { width: ${px(22)}; height: ${px(22)}; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.edgeever-card-date { justify-content: center; margin-bottom: ${px(12)}; }
.edgeever-card-title { font-weight: 700; line-height: 1.4; margin-bottom: ${px(6)}; }
.edgeever-image-card { min-height: 0; }
.edgeever-brand-badge { border: 0; justify-content: center; }
` : ""}
${active === "bento" ? `
.edgeever-card-header { display: grid; gap: ${px(8)}; margin-bottom: ${px(8)}; padding: ${px(16)} ${px(20)}; background: #ffffff; border-radius: ${px(12)}; }
.edgeever-card-date, .edgeever-card-title { margin: 0; }
.edgeever-card-body { padding: ${px(16)} ${px(20)}; background: #ffffff; border-radius: ${px(12)}; }
.edgeever-card-footer { margin-top: ${px(8)}; padding: ${px(12)} ${px(20)}; background: #ffffff; border-radius: ${px(12)}; }
.edgeever-brand-badge { border: 0; padding: 0; }
` : ""}
${active === "black-sun" ? `
.edgeever-image-card { padding: ${px(30)}; border: 0; background: #000410; box-shadow: 0 -${px(12)} ${px(34)} rgba(255,255,255,0.1), 0 -${px(10)} ${px(15)} rgba(255,255,255,0.4), 0 -${px(1)} ${px(3)} rgba(255,255,255,0.8), 0 -${px(10)} ${px(40)} rgba(92,84,175,0.5); }
.edgeever-card-title { line-height: 1.4; text-shadow: 0 0 ${px(6)} rgba(175,160,255,0.6); }
.edgeever-brand-badge { justify-content: center; border: 0; }
` : ""}
${active === "frame" ? `
.edgeever-image-card { padding-top: 0; border-radius: ${px(10)}; }
.edgeever-frame-toolbar { display: flex; align-items: center; justify-content: space-between; gap: ${px(12)}; padding: ${px(16)} ${px(8)}; margin-bottom: ${px(20)}; border-bottom: ${px(2)} solid #000000; }
.edgeever-frame-toolbar .edgeever-window-dots { margin-left: auto; }
.edgeever-frame-toolbar .edgeever-window-dots i { border: ${px(1.5)} solid #000000; width: ${px(12)}; height: ${px(12)}; background: transparent; }
.edgeever-frame-toolbar .edgeever-window-dots i:nth-child(2) { background: #000000; }
.edgeever-card-title { line-height: 1.625; }
.edgeever-card-title, .edgeever-card-body { padding-left: ${px(8)}; padding-right: ${px(8)}; }
.edgeever-card-date { padding-left: ${px(8)}; padding-right: ${px(8)}; }
.edgeever-card-footer { border-top: 1px solid var(--ee-line); padding: ${px(12)} ${px(8)} 0; }
.edgeever-brand-badge { border: 0; padding: 0; }
` : ""}
${active === "handwritten" ? `
.edgeever-image-wrapper::before, .edgeever-image-wrapper::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
.edgeever-image-wrapper::before { background: var(--ee-paper) no-repeat center / cover; z-index: 2; }
.edgeever-image-wrapper::after { background: var(--ee-paper-grain) repeat; filter: blur(${px(3)}); z-index: 3; }
.edgeever-image-card { overflow: visible; }
.edgeever-card-header, .edgeever-card-body, .edgeever-card-footer { position: relative; z-index: 4; }
.edgeever-card-title { font-weight: 400; }
.edgeever-card-date, .edgeever-card-footer { color: #746d60; line-height: 1.6; }
.edgeever-card-header { display: flex; flex-direction: column; }
.edgeever-card-meta, .edgeever-footer-author { justify-content: flex-end; }
.edgeever-card-meta, .edgeever-brand-badge { color: inherit; }
.edgeever-brand-badge { justify-content: center; border: 0; }
` : ""}
${active === "code" ? `
.edgeever-image-card { padding: 0; }
.edgeever-terminal-header { position: relative; display: flex; align-items: center; height: ${px(26)}; padding-top: ${px(10)}; margin: 0; }
.edgeever-terminal-name { display: block; width: 100%; padding: 0 ${px(65)}; text-align: center; color: #999999; font-size: ${px(12)}; line-height: 1.333333; overflow-wrap: anywhere; }
.edgeever-terminal-header .edgeever-window-dots { position: absolute; left: ${px(16)}; top: ${px(16)}; }
.edgeever-card-header { padding: ${px(16)} ${px(16)} 0; }
.edgeever-card-title { margin: 0 0 ${px(12)}; }
.edgeever-card-title:last-child { margin-bottom: 0; }
.edgeever-card-body { padding: ${px(16)} ${px(16)} ${px(21)}; min-height: ${px(37)}; line-height: 1.6; }
.edgeever-card-date { margin: 0; }
.edgeever-card-footer { margin: 0 ${px(16)} ${px(16)}; }
.edgeever-card-body pre { border: 0; padding: 0; margin: 0; font-family: inherit; font-size: inherit; line-height: 1.6; }
.edgeever-card-body pre code, .edgeever-card-body .edgeever-code-source { font-family: inherit; font-size: inherit; }
.edgeever-brand-badge { }
` : ""}
`;
};
