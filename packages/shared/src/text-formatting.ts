import { Extension, getStyleProperty } from "@tiptap/core";
import {
  NOTE_DEFAULT_FONT_SIZE, BLOCK_FORMATTING_TYPES, normalizeFontFamily, normalizeFontSize, normalizeTextAlignment, normalizeLineHeight, type TextAlignment,
} from "./text-formatting-values";

export * from "./text-formatting-values";

/**
 * Font, size, alignment and line-spacing values shared by every editor, the
 * Markdown codec and share pages. Values are stored as CSS so exported HTML
 * keeps them, but every read goes through a normalizer: Markdown is parsed in
 * Workers without a DOM, and pasted HTML can carry anything.
 */

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
