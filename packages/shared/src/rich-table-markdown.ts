import { Extension, mergeAttributes } from "@tiptap/core";
import type { JSONContent, MarkdownLexerConfiguration, MarkdownParseHelpers, MarkdownRendererHelpers, MarkdownToken } from "@tiptap/core";
import { normalizeTextColor, TEXT_COLORS } from "./text-colors";
import { hasBlockFormatting } from "./block-formatting-markdown";

/**
 * GFM tables hold one line of inline text per cell and nothing else. Tables
 * that use merged cells, cell colours, borders, block content or a header
 * column are written as an HTML table instead, with the cell content kept as
 * Markdown between blank lines so other renderers still format it:
 *
 *   <table>
 *   <tr>
 *   <th colspan="2" style="background-color: #fce9e7">
 *
 *   **Title**
 *
 *   </th>
 *   </tr>
 *   </table>
 */
export const HTML_TABLE_TOKEN = "rtnoteHtmlTable";

export const CELL_BORDER_NONE = "none";

export type TableCellStyle = {
  backgroundColor: string | null;
  borderColor: string | null;
};

/** A border is either hidden (`none`) or a hex colour. */
export const normalizeCellBorder = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().toLowerCase() === CELL_BORDER_NONE) return CELL_BORDER_NONE;
  return normalizeTextColor(value);
};

export const cellStyleDeclarations = (attrs: Record<string, unknown> | undefined) => {
  const background = normalizeTextColor(attrs?.backgroundColor);
  const border = normalizeCellBorder(attrs?.borderColor);
  return [
    background && `background-color: ${background}`,
    border && `border-color: ${border === CELL_BORDER_NONE ? "transparent" : border}`,
  ].filter(Boolean).join("; ");
};

/** Palette names let dark mode swap in the matching dark colour. */
export const cellPaletteAttributes = (attrs: Record<string, unknown> | undefined) => {
  const background = normalizeTextColor(attrs?.backgroundColor);
  const border = normalizeCellBorder(attrs?.borderColor);
  return {
    "data-ee-background-color": TEXT_COLORS.find((item) => item.background === background)?.name,
    "data-ee-border-color": border === CELL_BORDER_NONE ? CELL_BORDER_NONE : TEXT_COLORS.find((item) => item.text === border)?.name,
  };
};

const span = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 1 ? value : 1);

const isSimpleCell = (cell: JSONContent) => {
  const attrs = cell.attrs ?? {};
  if (span(attrs.colspan) > 1 || span(attrs.rowspan) > 1) return false;
  if (normalizeTextColor(attrs.backgroundColor) || normalizeCellBorder(attrs.borderColor)) return false;
  const content = cell.content ?? [];
  if (content.length > 1) return false;
  const [block] = content;
  return !block || (block.type === "paragraph" && !hasBlockFormatting(block.attrs));
};

/** True when a GFM table would lose something this table holds. */
export const tableNeedsHtml = (table: JSONContent) => {
  const rows = table.content ?? [];
  if (rows.length === 0) return false;
  return rows.some((row, rowIndex) => (row.content ?? []).some((cell) =>
    !isSimpleCell(cell)
    // GFM's first row is always the header row and no other row can be.
    || (rowIndex === 0) !== (cell.type === "tableHeader")));
};

const escapeAttribute = (value: string) => value.replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const cellOpeningTag = (cell: JSONContent) => {
  const attrs = cell.attrs ?? {};
  const tag = cell.type === "tableHeader" ? "th" : "td";
  const parts = [tag];
  if (span(attrs.colspan) > 1) parts.push(`colspan="${span(attrs.colspan)}"`);
  if (span(attrs.rowspan) > 1) parts.push(`rowspan="${span(attrs.rowspan)}"`);
  const widths = Array.isArray(attrs.colwidth)
    ? attrs.colwidth.map((width) => (typeof width === "number" && width > 0 ? Math.round(width) : 0))
    : [];
  if (widths.some(Boolean)) parts.push(`colwidth="${widths.join(",")}"`);
  if (attrs.align === "left" || attrs.align === "center" || attrs.align === "right") parts.push(`align="${attrs.align}"`);
  const style = cellStyleDeclarations(attrs);
  if (style) parts.push(`style="${escapeAttribute(style)}"`);
  return { tag, opening: `<${parts.join(" ")}>` };
};

const isEmptyCell = (cell: JSONContent) => {
  const content = cell.content ?? [];
  return content.length === 0 || (content.length === 1 && content[0]?.type === "paragraph" && !(content[0].content?.length));
};

export const renderHtmlTableMarkdown = (table: JSONContent, helpers: MarkdownRendererHelpers) => {
  const lines = ["<table>"];
  for (const row of table.content ?? []) {
    const height = typeof row.attrs?.rowheight === "number" && row.attrs.rowheight > 0 ? Math.round(row.attrs.rowheight) : null;
    lines.push(height ? `<tr style="height: ${height}px">` : "<tr>");
    for (const cell of row.content ?? []) {
      const { tag, opening } = cellOpeningTag(cell);
      if (isEmptyCell(cell)) {
        lines.push(`${opening}</${tag}>`);
        continue;
      }
      const body = helpers.renderChildren(cell.content ?? [], "\n\n").replace(/^\n+|\n+$/g, "");
      lines.push(opening, "", body, "", `</${tag}>`);
    }
    lines.push("</tr>");
  }
  lines.push("</table>");
  return lines.join("\n");
};

type ParsedCell = { header: boolean; attrs: Record<string, unknown>; tokens: MarkdownToken[] };
type ParsedRow = { attrs: Record<string, unknown>; cells: ParsedCell[] };

const TAG = /<(\/?)(table|tr|td|th|thead|tbody|tfoot)\b((?:[^"'>]|"[^"]*"|'[^']*')*)>/gi;

const readAttribute = (source: string, name: string) => {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(source);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
};

const readStyle = (source: string) => {
  const values: Record<string, string> = {};
  for (const declaration of (readAttribute(source, "style") ?? "").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    values[declaration.slice(0, separator).trim().toLowerCase()] = declaration.slice(separator + 1).trim();
  }
  return values;
};

const readCellAttributes = (source: string) => {
  const style = readStyle(source);
  const attrs: Record<string, unknown> = {};
  const colspan = Number.parseInt(readAttribute(source, "colspan") ?? "", 10);
  const rowspan = Number.parseInt(readAttribute(source, "rowspan") ?? "", 10);
  if (colspan > 1 && colspan <= 100) attrs.colspan = colspan;
  if (rowspan > 1 && rowspan <= 1000) attrs.rowspan = rowspan;
  const widths = (readAttribute(source, "colwidth") ?? "").split(",").map((width) => Number.parseInt(width, 10));
  if (widths.some((width) => width > 0)) attrs.colwidth = widths.map((width) => (width > 0 ? width : 0));
  const align = (readAttribute(source, "align") ?? style["text-align"] ?? "").toLowerCase();
  if (align === "left" || align === "center" || align === "right") attrs.align = align;
  const background = normalizeTextColor(style["background-color"] ?? style.background);
  if (background) attrs.backgroundColor = background;
  const border = style["border-color"]?.toLowerCase() === "transparent" ? CELL_BORDER_NONE : normalizeTextColor(style["border-color"]);
  if (border) attrs.borderColor = border;
  return attrs;
};

/** Finds the `</table>` that closes the table opening at index 0, allowing nested tables. */
const findTableEnd = (source: string) => {
  const tags = new RegExp(TAG.source, "gi");
  let depth = 0;
  for (let tag = tags.exec(source); tag; tag = tags.exec(source)) {
    if (tag[2]!.toLowerCase() !== "table") continue;
    depth += tag[1] ? -1 : 1;
    if (depth === 0) return tags.lastIndex;
  }
  return -1;
};

const parseRows = (inner: string, lexer: MarkdownLexerConfiguration): ParsedRow[] | null => {
  const tags = new RegExp(TAG.source, "gi");
  const rows: ParsedRow[] = [];
  let tableDepth = 0;
  let row: ParsedRow | null = null;
  let cell: { header: boolean; attrs: Record<string, unknown>; start: number } | null = null;
  for (let tag = tags.exec(inner); tag; tag = tags.exec(inner)) {
    const closing = Boolean(tag[1]);
    const name = tag[2]!.toLowerCase();
    if (name === "table") {
      tableDepth += closing ? -1 : 1;
      if (tableDepth < 0) return null;
      continue;
    }
    if (tableDepth > 0) continue; // Nested table inside a cell: part of the cell body.
    if (name === "tr" && !closing) {
      if (cell || row) return null;
      const style = readStyle(tag[3] ?? "");
      const height = Number.parseInt(style.height ?? "", 10);
      row = { attrs: height > 0 ? { rowheight: height } : {}, cells: [] };
    } else if (name === "tr" && closing) {
      if (!row || cell) return null;
      rows.push(row);
      row = null;
    } else if ((name === "td" || name === "th") && !closing) {
      if (!row || cell) return null;
      cell = { header: name === "th", attrs: readCellAttributes(tag[3] ?? ""), start: tags.lastIndex };
    } else if ((name === "td" || name === "th") && closing) {
      if (!row || !cell) return null;
      const body = inner.slice(cell.start, tag.index).trim();
      row.cells.push({ header: cell.header, attrs: cell.attrs, tokens: body ? lexer.blockTokens(body) : [] });
      cell = null;
    }
  }
  if (row || cell || tableDepth !== 0) return null;
  return rows.length && rows.every((item) => item.cells.length) ? rows : null;
};

export const htmlTableTokenizer = {
  name: HTML_TABLE_TOKEN,
  level: "block" as const,
  start: (source: string) => {
    const match = /^ {0,3}<table\b/im.exec(source);
    return match ? match.index : -1;
  },
  tokenize(source: string, _tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) {
    const opening = /^ {0,3}<table\b(?:[^"'>]|"[^"]*"|'[^']*')*>/i.exec(source);
    if (!opening) return undefined;
    const indent = opening[0].length - opening[0].trimStart().length;
    const end = findTableEnd(source.slice(indent));
    if (end < 0) return undefined;
    const tableSource = source.slice(indent, indent + end);
    const trailing = /^[ \t]*(?:\n|$)/.exec(source.slice(indent + end));
    if (!trailing) return undefined;
    const rows = parseRows(tableSource.slice(opening[0].length - indent, tableSource.lastIndexOf("<")), lexer);
    if (!rows) return undefined;
    return { type: HTML_TABLE_TOKEN, raw: source.slice(0, indent + end + trailing[0].length), htmlRows: rows, tokens: [] };
  },
};

export const parseHtmlTableToken = (token: MarkdownToken, helpers: MarkdownParseHelpers): JSONContent | JSONContent[] => {
  const rows = (token as { htmlRows?: ParsedRow[] }).htmlRows ?? [];
  return {
    type: "table",
    content: rows.map((row) => ({
      type: "tableRow",
      ...(Object.keys(row.attrs).length ? { attrs: row.attrs } : {}),
      content: row.cells.map((cell) => {
        const blocks = cell.tokens.length ? helpers.parseChildren(cell.tokens) : [];
        return {
          type: cell.header ? "tableHeader" : "tableCell",
          ...(Object.keys(cell.attrs).length ? { attrs: cell.attrs } : {}),
          content: blocks.length ? blocks : [{ type: "paragraph" }],
        };
      }),
    })),
  };
};

/** Reads RTNote's HTML tables (and simple foreign ones) back into table nodes. */
export const HtmlTableMarkdown = Extension.create({
  name: HTML_TABLE_TOKEN,
  markdownTokenizer: htmlTableTokenizer,
  parseMarkdown: (token, helpers) => parseHtmlTableToken(token, helpers),
});

/** Cell attributes shared by tableCell and tableHeader. */
export const tableCellStyleAttributes = () => ({
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => normalizeTextColor(element.style.backgroundColor || element.getAttribute("data-background-color")),
    renderHTML: () => ({}),
  },
  borderColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.borderColor === "transparent"
      ? CELL_BORDER_NONE
      : normalizeTextColor(element.style.borderColor),
    renderHTML: () => ({}),
  },
});

/** Applied once per cell so the two style attributes share one `style`. */
export const renderTableCellStyle = (attrs: Record<string, unknown>, HTMLAttributes: Record<string, unknown>) => {
  const style = cellStyleDeclarations(attrs);
  return mergeAttributes(HTMLAttributes, cellPaletteAttributes(attrs), style ? { style } : {});
};
