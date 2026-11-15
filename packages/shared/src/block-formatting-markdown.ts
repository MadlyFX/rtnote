import { Extension, type AnyExtension, type JSONContent, type MarkdownRendererHelpers, type RenderContext } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { BLOCK_FORMATTING_TYPES, blockFormattingAttributes, normalizeLineHeight, normalizeTextAlignment } from "./text-formatting";

/**
 * Markdown has no syntax for alignment or line spacing, so a formatted
 * paragraph or heading is wrapped in an HTML block:
 *
 *   <div align="center" style="line-height: 1.5">
 *
 *   Centred **Markdown** text
 *
 *   </div>
 *
 * The blank lines let other Markdown renderers (GitHub included) still format
 * the inner text. RTNote reads the wrapper back with the tokenizer below.
 */
export const ALIGNED_BLOCK_TOKEN = "rtnoteAlignedBlock";

export const wrapFormattedBlockMarkdown = (markdown: string, attrs: Record<string, unknown> | undefined) => {
  const { textAlign, lineHeight } = blockFormattingAttributes(attrs);
  const align = textAlign && textAlign !== "left" ? textAlign : null;
  if ((!align && !lineHeight) || !markdown.trim()) return markdown;
  return `<div${align ? ` align="${align}"` : ""}${lineHeight ? ` style="line-height: ${lineHeight}"` : ""}>\n\n${markdown}\n\n</div>`;
};

export const hasBlockFormatting = (attrs: Record<string, unknown> | undefined) => {
  const { textAlign, lineHeight } = blockFormattingAttributes(attrs);
  return Boolean((textAlign && textAlign !== "left") || lineHeight);
};

// Table children are rendered by the table itself (parentType "table"); GFM
// tables never contain formatted paragraphs because those switch to HTML.
const WRAPPABLE_PARENTS = new Set(["doc", "blockquote", "detailsContent", "table"]);

type RenderMarkdown = (node: JSONContent, helpers: MarkdownRendererHelpers, context: RenderContext) => string;

/** StarterKit whose paragraph and heading keep alignment and spacing in Markdown. */
export const RTNoteStarterKit = StarterKit.extend({
  addExtensions() {
    return (this.parent?.() ?? []).map((extension: AnyExtension) => {
      if (!(BLOCK_FORMATTING_TYPES as readonly string[]).includes(extension.name)) return extension;
      const renderMarkdown = extension.config.renderMarkdown as RenderMarkdown | undefined;
      if (!renderMarkdown) return extension;
      return extension.extend({
        renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers, context: RenderContext) {
          const markdown = renderMarkdown.call(this as never, node, helpers, context);
          // The blank lines the wrapper needs would end a list item or a GFM
          // table row, so formatting is only written where blocks may follow.
          return WRAPPABLE_PARENTS.has(context?.parentType ?? "doc")
            ? wrapFormattedBlockMarkdown(markdown, node.attrs)
            : markdown;
        },
      });
    });
  },
});

const OPENING = /^ {0,3}<div((?:\s+(?:align\s*=\s*"[a-z]+"|style\s*=\s*"[^"<>]*"))+)\s*>[ \t]*\n/i;
const CLOSING = /\n[ \t]*<\/div>[ \t]*(?:\n|$)/i;

const readWrapperAttributes = (source: string) => {
  const align = normalizeTextAlignment(/align\s*=\s*"([^"]*)"/i.exec(source)?.[1]);
  const style = /style\s*=\s*"([^"]*)"/i.exec(source)?.[1] ?? "";
  let lineHeight: string | null = null;
  for (const declaration of style.split(";")) {
    const [property, value] = declaration.split(":");
    if (property?.trim().toLowerCase() === "line-height") lineHeight = normalizeLineHeight(value?.trim());
    else if (property?.trim()) return null; // Only RTNote's own wrapper is read back.
  }
  return align || lineHeight ? { textAlign: align === "left" ? null : align, lineHeight } : null;
};

/** Reads the `<div align>` wrapper back onto the paragraphs and headings inside it. */
export const AlignedBlockMarkdown = Extension.create({
  name: ALIGNED_BLOCK_TOKEN,
  markdownTokenizer: {
    name: ALIGNED_BLOCK_TOKEN,
    level: "block",
    start: (source: string) => {
      const match = /^ {0,3}<div\s+(?:align|style)\s*=/im.exec(source);
      return match ? match.index : -1;
    },
    tokenize(source, _tokens, lexer) {
      const opening = OPENING.exec(source);
      if (!opening) return undefined;
      const attrs = readWrapperAttributes(opening[1]!);
      if (!attrs) return undefined;
      const rest = source.slice(opening[0].length);
      const closing = CLOSING.exec(rest);
      if (!closing) return undefined;
      const inner = rest.slice(0, closing.index);
      // A nested <div> means this is not RTNote's single-level wrapper.
      if (/<div\b/i.test(inner)) return undefined;
      return {
        type: ALIGNED_BLOCK_TOKEN,
        raw: opening[0] + rest.slice(0, closing.index + closing[0].length),
        blockAttrs: attrs,
        tokens: lexer.blockTokens(inner.replace(/^\n+/, "")),
      };
    },
  },
  parseMarkdown(token, helpers) {
    const attrs = (token as { blockAttrs?: Record<string, unknown> }).blockAttrs ?? {};
    const nodes = helpers.parseChildren(token.tokens ?? []);
    return nodes.map((node: JSONContent) => (BLOCK_FORMATTING_TYPES as readonly string[]).includes(node.type ?? "")
      ? { ...node, attrs: { ...node.attrs, ...attrs } }
      : node);
  },
});
