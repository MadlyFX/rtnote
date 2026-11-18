import { mergeAttributes } from "@tiptap/core";
import { TextStyle, Color, BackgroundColor } from "@tiptap/extension-text-style";
import { NoteFontFamily, NoteFontSize, normalizeFontFamily, normalizeFontSize, readTextStyleDeclarations } from "./text-formatting";
import { TEXT_COLORS, normalizeTextColor } from "./text-color-values";

export { TEXT_COLORS, normalizeTextColor } from "./text-color-values";

const readColors = (attributes: string) => {
  const style = /(?:^|\s)style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributes);
  const source = style?.[1] ?? style?.[2] ?? "";
  const values: Record<string, string> = { ...readTextStyleDeclarations(source) };
  for (const declaration of source.split(";")) {
    const [property, value] = declaration.split(":");
    const color = normalizeTextColor(value);
    if (color && property.trim().toLowerCase() === "color") values.color = color;
    if (color && property.trim().toLowerCase() === "background-color") values.backgroundColor = color;
  }
  return values;
};

export const EdgeEverTextStyle = TextStyle.extend({
  renderHTML({ mark, HTMLAttributes }) {
    const color = normalizeTextColor(mark.attrs.color);
    const background = normalizeTextColor(mark.attrs.backgroundColor);
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      "data-ee-text-color": TEXT_COLORS.find((item) => item.text === color)?.name,
      "data-ee-background-color": TEXT_COLORS.find((item) => item.background === background)?.name,
    }), 0];
  },
  renderMarkdown(node, helpers) {
    const color = normalizeTextColor(node.attrs?.color);
    const background = normalizeTextColor(node.attrs?.backgroundColor);
    const family = normalizeFontFamily(node.attrs?.fontFamily);
    const size = normalizeFontSize(node.attrs?.fontSize);
    const style = [
      color && `color: ${color}`,
      background && `background-color: ${background}`,
      family && `font-family: ${family}`,
      size && `font-size: ${size}`,
    ].filter(Boolean).join("; ");
    const content = helpers.renderChildren(node.content ?? []);
    return style ? `<span style="${style}">${content}</span>` : content;
  },
  parseMarkdown(token, helpers) {
    // A nested span overrides individual properties rather than creating two
    // competing textStyle marks (ProseMirror only keeps one of each mark type).
    return helpers.parseInline(token.tokens ?? []).map((node) => ({
      ...node,
      marks: [
        ...(node.marks ?? []).filter((mark) => mark.type !== "textStyle"),
        { type: "textStyle", attrs: {
          ...token.colors,
          ...(node.marks ?? []).find((mark) => mark.type === "textStyle")?.attrs,
        } },
      ],
    }));
  },
  markdownTokenizer: {
    name: "textStyle",
    level: "inline",
    start: (source) => source.search(/<span\b/i),
    tokenize(source, _tokens, lexer) {
      const opening = /^<span\b([^>]*)>/i.exec(source);
      if (!opening) return undefined;
      const colors = readColors(opening[1]);
      if (!Object.keys(colors).length) return undefined;
      const tags = /<\/?span\b[^>]*>/gi;
      tags.lastIndex = opening[0].length;
      let depth = 1;
      for (let tag = tags.exec(source); tag; tag = tags.exec(source)) {
        depth += tag[0].startsWith("</") ? -1 : 1;
        if (depth === 0) {
          return {
            type: "textStyle", raw: source.slice(0, tags.lastIndex), colors,
            tokens: lexer.inlineTokens(source.slice(opening[0].length, tag.index)),
          };
        }
      }
      return undefined;
    },
  },
});

export const createTextColorExtensions = () => [EdgeEverTextStyle, Color, BackgroundColor, NoteFontFamily, NoteFontSize];
