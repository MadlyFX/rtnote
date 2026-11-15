import { Extension, getStyleProperty } from "@tiptap/core";

/**
 * Font, size, alignment and line-spacing values shared by every editor, the
 * Markdown codec and share pages. Values are stored as CSS so exported HTML
 * keeps them, but every read goes through a normalizer: Markdown is parsed in
 * Workers without a DOM, and pasted HTML can carry anything.
 */

/**
 * Picker choices. Each stack ends in a generic family, so a note renders with
 * a sensible fallback on every platform and on share pages without
 * downloading fonts.
 */
export const NOTE_FONT_FAMILIES = [
  { id: "sans", label: "Sans serif", value: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" },
  { id: "serif", label: "Serif", value: "Georgia, 'Times New Roman', Times, serif" },
  { id: "mono", label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace" },
  { id: "arial", label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { id: "verdana", label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { id: "georgia", label: "Georgia", value: "Georgia, serif" },
  { id: "times", label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { id: "courier", label: "Courier New", value: "'Courier New', Courier, monospace" },
] as const;

export type NoteFontFamilyId = (typeof NOTE_FONT_FAMILIES)[number]["id"];

/** Fixed size scale in CSS pixels. 16px is the body size and means "default". */
export const NOTE_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px"] as const;
export const NOTE_DEFAULT_FONT_SIZE = "16px";

export const TEXT_ALIGNMENTS = ["left", "center", "right", "justify"] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

export const NOTE_LINE_HEIGHTS = ["1", "1.15", "1.5", "2"] as const;

/** Node types that take alignment and line spacing. */
export const BLOCK_FORMATTING_TYPES = ["paragraph", "heading"] as const;

const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 96;

/**
 * Accepts a CSS font-family list made of names and quoted names only. Double
 * quotes become single quotes so the value fits inside a double-quoted HTML
 * `style` attribute.
 */
export const normalizeFontFamily = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const family = value.replaceAll('"', "'").replace(/\s+/g, " ").trim();
  if (!family || family.length > 200) return null;
  // Letters (any script), digits, spaces, hyphens, underscores, dots, commas and quotes.
  if (!/^[\p{L}\p{N} ,'._-]+$/u.test(family)) return null;
  const parts = family.split(",").map((part) => part.trim());
  if (parts.some((part) => !part || (part.includes("'") && !/^'[^']+'$/.test(part)))) return null;
  return parts.join(", ");
};

export const fontFamilyId = (value: unknown): NoteFontFamilyId | null => {
  const family = normalizeFontFamily(value);
  return NOTE_FONT_FAMILIES.find((item) => item.value === family)?.id ?? null;
};

/** Pixel sizes (and points, converted) within a readable range. */
export const normalizeFontSize = (value: unknown): string | null => {
  if (typeof value === "number") return normalizeFontSize(`${value}px`);
  if (typeof value !== "string") return null;
  const match = /^(\d{1,3}(?:\.\d+)?)\s*(px|pt)$/i.exec(value.trim());
  if (!match) return null;
  const pixels = match[2]!.toLowerCase() === "pt" ? Number(match[1]) * 4 / 3 : Number(match[1]);
  const rounded = Math.round(pixels);
  if (!Number.isFinite(rounded) || rounded < FONT_SIZE_MIN || rounded > FONT_SIZE_MAX) return null;
  return `${rounded}px`;
};

export const normalizeTextAlignment = (value: unknown): TextAlignment | null => {
  if (typeof value !== "string") return null;
  const alignment = value.trim().toLowerCase();
  if (alignment === "start") return "left";
  if (alignment === "end") return "right";
  return TEXT_ALIGNMENTS.includes(alignment as TextAlignment) ? alignment as TextAlignment : null;
};

/** Unitless multipliers between 0.8 and 3. */
export const normalizeLineHeight = (value: unknown): string | null => {
  const source = typeof value === "number" ? String(value) : value;
  if (typeof source !== "string" || !/^\d(?:\.\d{1,2})?$/.test(source.trim())) return null;
  const height = Number(source.trim());
  if (height < 0.8 || height > 3) return null;
  return String(height);
};

/** Reads the declarations RTNote writes from a raw `style` attribute value. */
export const readTextStyleDeclarations = (style: string) => {
  const values: { fontFamily?: string; fontSize?: string } = {};
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (property === "font-family") {
      const family = normalizeFontFamily(value);
      if (family) values.fontFamily = family;
    }
    if (property === "font-size") {
      const size = normalizeFontSize(value);
      if (size) values.fontSize = size;
    }
  }
  return values;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    rtnoteFontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    rtnoteFontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    rtnoteBlockFormatting: {
      setTextAlign: (alignment: TextAlignment) => ReturnType;
      unsetTextAlign: () => ReturnType;
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

/** `fontFamily` on the shared textStyle mark, next to colour and highlight. */
export const NoteFontFamily = Extension.create({
  name: "fontFamily",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (element) => normalizeFontFamily(getStyleProperty(element, "font-family") ?? element.style.fontFamily),
          renderHTML: (attributes) => {
            const family = normalizeFontFamily(attributes.fontFamily);
            return family ? { style: `font-family: ${family}` } : {};
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily) => ({ chain }) => {
        const family = normalizeFontFamily(fontFamily);
        if (!family) return false;
        return chain().setMark("textStyle", { fontFamily: family }).run();
      },
      unsetFontFamily: () => ({ chain }) =>
        chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** `fontSize` on the shared textStyle mark. */
export const NoteFontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => normalizeFontSize(getStyleProperty(element, "font-size") ?? element.style.fontSize),
          renderHTML: (attributes) => {
            const size = normalizeFontSize(attributes.fontSize);
            return size ? { style: `font-size: ${size}` } : {};
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        const size = normalizeFontSize(fontSize);
        if (!size) return false;
        if (size === NOTE_DEFAULT_FONT_SIZE) {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        }
        return chain().setMark("textStyle", { fontSize: size }).run();
      },
      unsetFontSize: () => ({ chain }) =>
        chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** Text alignment and line spacing on paragraphs and headings. */
export const BlockFormatting = Extension.create({
  name: "rtnoteBlockFormatting",
  addGlobalAttributes() {
    return [{
      types: [...BLOCK_FORMATTING_TYPES],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (element) => normalizeTextAlignment(element.style.textAlign || element.getAttribute("align")),
          renderHTML: (attributes) => {
            const alignment = normalizeTextAlignment(attributes.textAlign);
            return alignment && alignment !== "left" ? { style: `text-align: ${alignment}` } : {};
          },
        },
        lineHeight: {
          default: null,
          parseHTML: (element) => normalizeLineHeight(element.style.lineHeight),
          renderHTML: (attributes) => {
            const lineHeight = normalizeLineHeight(attributes.lineHeight);
            return lineHeight ? { style: `line-height: ${lineHeight}` } : {};
          },
        },
      },
    }];
  },
  addCommands() {
    const update = (attributes: Record<string, unknown>) => ({ commands }: { commands: { updateAttributes: (type: string, attrs: Record<string, unknown>) => boolean } }) =>
      BLOCK_FORMATTING_TYPES.map((type) => commands.updateAttributes(type, attributes)).some(Boolean);
    return {
      setTextAlign: (alignment) => (props) => {
        const value = normalizeTextAlignment(alignment);
        if (!value) return false;
        // Left is the default, so it is stored as "no alignment".
        return update({ textAlign: value === "left" ? null : value })(props);
      },
      unsetTextAlign: () => (props) => update({ textAlign: null })(props),
      setLineHeight: (lineHeight) => (props) => {
        const value = normalizeLineHeight(lineHeight);
        if (!value) return false;
        return update({ lineHeight: value })(props);
      },
      unsetLineHeight: () => (props) => update({ lineHeight: null })(props),
    };
  },
  // No keyboard shortcuts: the usual Mod-Shift-L/E/R/J collide with browser
  // reload and developer-tool shortcuts.
});

export const blockFormattingAttributes = (attrs: Record<string, unknown> | undefined) => ({
  textAlign: normalizeTextAlignment(attrs?.textAlign),
  lineHeight: normalizeLineHeight(attrs?.lineHeight),
});
