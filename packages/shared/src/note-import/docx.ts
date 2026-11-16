import type { TiptapDoc, TiptapMark, TiptapNode, TiptapTextNode } from "../content";
import { NOTE_DEFAULT_FONT_SIZE, NOTE_FONT_FAMILIES, normalizeFontFamily, normalizeFontSize, normalizeLineHeight, normalizeTextAlignment } from "../text-formatting-values";
import { normalizeTextColor } from "../text-color-values";
import { CELL_BORDER_NONE, normalizeCellBorder } from "../table-cell-style";
import { IMAGE_CAPTION_NODE_TYPE, IMAGE_FIGURE_NODE_TYPE } from "../image-figure-names";
import { parseImageWidth } from "../image-display";
import { importTime } from "./metadata";
import { docxResourceSource } from "./docx-resources";
import {
  childElement, childElements, DocxPackage, findElement, mainDocumentPath, textContent,
  type DocxRelationship, type XmlElement,
} from "./docx-package";

/**
 * Converts WordprocessingML straight into RTNote's TipTap document (schema 2).
 * Markdown is never an intermediate: fonts, alignment, line spacing, merged
 * and coloured cells and captions all live in content_json.
 *
 * Fidelity rule: the document's own defaults (docDefaults plus the Normal
 * style) become the note's defaults, so they are not stamped onto every run.
 * Only formatting that differs from them is kept. Every value goes through
 * the shared normalizers, so nothing reaches the note that the editor, the
 * Markdown codec or share pages would not accept themselves.
 */

export { DOCX_RESOURCE_SCHEME, docxResourceSource } from "./docx-resources";

export type DocxImage = { part: string; filename: string; mimeType: string; byteSize: number };
export type DocxSkippedContent = "textBox" | "footnote" | "endnote" | "equation" | "chart" | "embeddedObject" | "linkedImage" | "drawing" | "unsupportedImage";
export type DocxDocument = {
  doc: TiptapDoc; images: DocxImage[]; skipped: DocxSkippedContent[];
  createdAt?: string; updatedAt?: string;
};

/** Image types every RTNote client renders. EMF, WMF and TIFF are reported instead. */
const RENDERABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/avif"]);
const EMU_PER_TWIP = 635;
/** Letter page with 1-inch margins, Word's default text width, in twips. */
const DEFAULT_TEXT_WIDTH_TWIPS = 12240 - 2 * 1440;
const SAFE_LINK = /^(?:https?:|mailto:|tel:)/i;

/** Word's fixed highlight palette. */
const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkblue: "#000080", darkcyan: "#008080", darkgreen: "#008000", darkmagenta: "#800080", darkred: "#800000",
  darkyellow: "#808000", darkgray: "#808080", lightgray: "#c0c0c0", black: "#000000", white: "#ffffff",
};

/** Word font names that match an RTNote picker entry use that entry's stack. */
const KNOWN_FONTS: Record<string, string> = {
  arial: "arial", verdana: "verdana", "trebuchet ms": "trebuchet", georgia: "georgia",
  "times new roman": "times", "courier new": "courier",
};
const GENERIC_FAMILIES: Record<string, string> = { roman: "serif", swiss: "sans-serif", modern: "monospace", script: "cursive", decorative: "fantasy" };

type RunProps = {
  bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; hidden?: boolean;
  color?: string | null; background?: string | null; font?: string | null; size?: number;
};
type ParaProps = { align?: string | null; line?: string | null; numId?: string; ilvl?: number; outlineLvl?: number };
type Borders = Partial<Record<"top" | "left" | "bottom" | "right" | "insideH" | "insideV", string | null>>;
type Style = {
  id: string; type: string; name: string; basedOn?: string;
  pPr: ParaProps; rPr: RunProps; borders: Borders;
  firstRow?: ConditionalFormat; firstCol?: ConditionalFormat;
};
type ConditionalFormat = { bold: boolean; fill: string | null; color: string | null };
type ListInfo = { numId: string; level: number; ordered: boolean; start: number };
type Group = { nodes: TiptapNode[]; list?: ListInfo; caption?: boolean; quote?: boolean };
type Inline = TiptapNode | TiptapTextNode;

const defined = <T extends object>(value: T) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
const merge = <T extends object>(...values: Array<T | undefined>): T => Object.assign({}, ...values.map((value) => (value ? defined(value) : {}))) as T;
const toggle = (element: XmlElement | undefined) =>
  element ? !/^(?:0|false|off|none)$/i.test(element.attrs["w:val"] ?? "true") : undefined;
const hexColor = (value: string | undefined) => (value && /^[\da-f]{6}$/i.test(value) ? normalizeTextColor(`#${value}`) : null);
const lastOf = <T>(items: readonly T[], test: (item: T) => boolean) => [...items].reverse().find(test);
const toInt = (value: string | undefined) => {
  const number = Number.parseInt(value ?? "", 10);
  return Number.isFinite(number) ? number : undefined;
};

/** Built-in style names are stored in lower case ("heading 1", "caption"). */
const headingLevel = (style: Style | undefined) => {
  const name = style?.name ?? "";
  const match = /^heading ([1-9])$/.exec(name);
  if (match) return Math.min(6, Number(match[1]));
  if (name === "title") return 1;
  return undefined;
};

const readBorder = (element: XmlElement | undefined): string | null | undefined => {
  if (!element) return undefined;
  const value = (element.attrs["w:val"] ?? "").toLowerCase();
  if (value === "nil" || value === "none") return CELL_BORDER_NONE;
  return hexColor(element.attrs["w:color"]) ?? null;
};

const readBorders = (element: XmlElement | undefined): Borders => {
  if (!element) return {};
  return defined({
    top: readBorder(childElement(element, "w:top")),
    left: readBorder(childElement(element, "w:left") ?? childElement(element, "w:start")),
    bottom: readBorder(childElement(element, "w:bottom")),
    right: readBorder(childElement(element, "w:right") ?? childElement(element, "w:end")),
    insideH: readBorder(childElement(element, "w:insideH")),
    insideV: readBorder(childElement(element, "w:insideV")),
  });
};

/**
 * One border value for a whole cell, as RTNote stores it. In Word a side
 * that neither the table style nor the table or cell defines has no border,
 * so a cell is hidden when every side is absent or hidden. Otherwise the
 * first explicit non-black colour wins; black and "auto" are Word's default
 * grid, which RTNote already draws.
 */
const cellBorder = (sides: Array<string | null | undefined>) => {
  if (sides.every((side) => side === undefined || side === CELL_BORDER_NONE)) return CELL_BORDER_NONE;
  const colour = sides.find((side) => side && side !== CELL_BORDER_NONE && side !== "#000000");
  return normalizeCellBorder(colour) ?? null;
};

const readShading = (element: XmlElement | undefined) => {
  const fill = element?.attrs["w:fill"];
  return fill && fill.toLowerCase() !== "auto" ? hexColor(fill) : undefined;
};

class DocxConverter {
  private styles = new Map<string, Style>();
  private defaultParagraphStyle?: string;
  private defaultTableStyle?: string;
  private docDefaults: { rPr: RunProps; pPr: ParaProps } = { rPr: {}, pPr: {} };
  private numbering = new Map<string, { abstractId: string; starts: Map<number, number> }>();
  private abstractNumbering = new Map<string, Map<number, { format: string; start: number }>>();
  private listCounters = new Map<string, number>();
  private themeFonts = { minor: "", major: "" };
  private fontFamilies = new Map<string, string>();
  private rels = new Map<string, DocxRelationship>();
  private images = new Map<string, DocxImage>();
  private skipped = new Set<DocxSkippedContent>();
  private skip(kind: DocxSkippedContent) { this.skipped.add(kind); this.dropped++; }
  /** Counts dropped objects, so a paragraph that held only those leaves no empty line. */
  private dropped = 0;
  /** Run properties a table style gives the cell being converted (header row text colour). */
  private cellRun: RunProps = {};
  private fields: Array<{ instr: string; result: boolean; link?: string }> = [];
  private textWidthTwips = DEFAULT_TEXT_WIDTH_TWIPS;
  private baseline: { run: RunProps; para: ParaProps } = { run: {}, para: {} };

  constructor(private pkg: DocxPackage, private documentPath: string) {}

  async load() {
    this.rels = await this.pkg.relationships(this.documentPath);
    const target = (pattern: RegExp) => [...this.rels.values()].find((rel) => !rel.external && pattern.test(rel.type))?.target;
    const theme = await this.pkg.xml(target(/\/theme$/) ?? "word/theme/theme1.xml");
    const fontScheme = findElement(theme, "a:fontScheme");
    this.themeFonts.minor = childElement(childElement(fontScheme, "a:minorFont"), "a:latin")?.attrs.typeface ?? "";
    this.themeFonts.major = childElement(childElement(fontScheme, "a:majorFont"), "a:latin")?.attrs.typeface ?? "";
    const fontTable = await this.pkg.xml(target(/\/fontTable$/) ?? "word/fontTable.xml");
    for (const font of childElements(fontTable, "w:font")) {
      const family = childElement(font, "w:family")?.attrs["w:val"];
      if (font.attrs["w:name"] && family) this.fontFamilies.set(font.attrs["w:name"].toLowerCase(), family.toLowerCase());
    }
    this.loadStyles(await this.pkg.xml(target(/\/styles$/) ?? "word/styles.xml"));
    this.loadNumbering(await this.pkg.xml(target(/\/numbering$/) ?? "word/numbering.xml"));
    const normal = this.defaultParagraphStyle ? this.styles.get(this.defaultParagraphStyle) : undefined;
    this.baseline = {
      run: merge(this.docDefaults.rPr, normal ? this.styleRun(normal.id) : undefined),
      para: merge(this.docDefaults.pPr, normal ? this.stylePara(normal.id) : undefined),
    };
  }

  private loadStyles(root: XmlElement | undefined) {
    const defaults = childElement(root, "w:docDefaults");
    this.docDefaults = {
      rPr: this.readRun(childElement(childElement(defaults, "w:rPrDefault"), "w:rPr")),
      pPr: this.readPara(childElement(childElement(defaults, "w:pPrDefault"), "w:pPr")),
    };
    for (const style of childElements(root, "w:style")) {
      const id = style.attrs["w:styleId"];
      if (!id) continue;
      const type = style.attrs["w:type"] ?? "paragraph";
      const conditional = (kind: string) => {
        const part = childElements(style, "w:tblStylePr").find((item) => item.attrs["w:type"] === kind);
        if (!part) return undefined;
        const rPr = childElement(part, "w:rPr");
        return {
          bold: toggle(childElement(rPr, "w:b")) ?? false,
          fill: readShading(childElement(childElement(part, "w:tcPr"), "w:shd")) ?? null,
          color: hexColor(childElement(rPr, "w:color")?.attrs["w:val"]),
        };
      };
      this.styles.set(id, {
        id, type,
        name: (childElement(style, "w:name")?.attrs["w:val"] ?? id).toLowerCase(),
        basedOn: childElement(style, "w:basedOn")?.attrs["w:val"],
        pPr: this.readPara(childElement(style, "w:pPr")),
        rPr: this.readRun(childElement(style, "w:rPr")),
        borders: readBorders(childElement(childElement(style, "w:tblPr"), "w:tblBorders")),
        firstRow: conditional("firstRow"),
        firstCol: conditional("firstCol"),
      });
      if (style.attrs["w:default"] === "1" || style.attrs["w:default"] === "true") {
        if (type === "paragraph") this.defaultParagraphStyle = id;
        if (type === "table") this.defaultTableStyle = id;
      }
    }
  }

  private loadNumbering(root: XmlElement | undefined) {
    for (const abstract of childElements(root, "w:abstractNum")) {
      const levels = new Map<number, { format: string; start: number }>();
      for (const level of childElements(abstract, "w:lvl")) {
        levels.set(toInt(level.attrs["w:ilvl"]) ?? 0, {
          format: childElement(level, "w:numFmt")?.attrs["w:val"] ?? "decimal",
          start: toInt(childElement(level, "w:start")?.attrs["w:val"]) ?? 1,
        });
      }
      if (abstract.attrs["w:abstractNumId"] !== undefined) this.abstractNumbering.set(abstract.attrs["w:abstractNumId"], levels);
    }
    for (const num of childElements(root, "w:num")) {
      const starts = new Map<number, number>();
      for (const override of childElements(num, "w:lvlOverride")) {
        const start = toInt(childElement(override, "w:startOverride")?.attrs["w:val"]);
        if (start !== undefined) starts.set(toInt(override.attrs["w:ilvl"]) ?? 0, start);
      }
      const abstractId = childElement(num, "w:abstractNumId")?.attrs["w:val"];
      if (num.attrs["w:numId"] && abstractId !== undefined) this.numbering.set(num.attrs["w:numId"], { abstractId, starts });
    }
  }

  private fontName(fonts: XmlElement | undefined) {
    if (!fonts) return undefined;
    const theme = fonts.attrs["w:asciiTheme"] ?? fonts.attrs["w:hAnsiTheme"];
    const name = fonts.attrs["w:ascii"] ?? fonts.attrs["w:hAnsi"]
      ?? (theme ? (/^major/i.test(theme) ? this.themeFonts.major : this.themeFonts.minor) : undefined)
      ?? fonts.attrs["w:eastAsia"] ?? fonts.attrs["w:cs"];
    return name || undefined;
  }

  private readRun(rPr: XmlElement | undefined): RunProps {
    if (!rPr) return {};
    const underline = childElement(rPr, "w:u");
    const colour = childElement(rPr, "w:color")?.attrs["w:val"];
    const highlight = childElement(rPr, "w:highlight")?.attrs["w:val"]?.toLowerCase();
    const shading = readShading(childElement(rPr, "w:shd"));
    const size = toInt(childElement(rPr, "w:sz")?.attrs["w:val"]);
    return defined({
      bold: toggle(childElement(rPr, "w:b")),
      italic: toggle(childElement(rPr, "w:i")),
      underline: underline ? (underline.attrs["w:val"] ?? "single").toLowerCase() !== "none" : undefined,
      strike: toggle(childElement(rPr, "w:strike") ?? childElement(rPr, "w:dstrike")),
      hidden: toggle(childElement(rPr, "w:vanish")),
      color: colour === undefined ? undefined : colour.toLowerCase() === "auto" ? null : hexColor(colour),
      background: highlight !== undefined
        ? (highlight === "none" ? null : HIGHLIGHT_COLORS[highlight] ?? null)
        : shading,
      font: this.fontName(childElement(rPr, "w:rFonts")),
      size: size && size > 0 ? size : undefined,
    });
  }

  private readPara(pPr: XmlElement | undefined): ParaProps {
    if (!pPr) return {};
    const jc = childElement(pPr, "w:jc")?.attrs["w:val"]?.toLowerCase();
    const spacing = childElement(pPr, "w:spacing");
    const numPr = childElement(pPr, "w:numPr");
    const rule = (spacing?.attrs["w:lineRule"] ?? "auto").toLowerCase();
    const line = toInt(spacing?.attrs["w:line"]);
    return defined({
      align: jc === undefined ? undefined
        : jc === "both" || jc === "distribute" || /kashida|thaidistribute/.test(jc) ? "justify"
          : normalizeTextAlignment(jc) ?? null,
      line: line !== undefined && rule === "auto" ? normalizeLineHeight(String(Math.round(line / 240 * 100) / 100)) : undefined,
      numId: childElement(numPr, "w:numId")?.attrs["w:val"],
      ilvl: toInt(childElement(numPr, "w:ilvl")?.attrs["w:val"]),
      outlineLvl: toInt(childElement(pPr, "w:outlineLvl")?.attrs["w:val"]),
    });
  }

  private chain(id: string | undefined) {
    const result: Style[] = [];
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const style = this.styles.get(id);
      if (!style) break;
      result.unshift(style);
      id = style.basedOn;
    }
    return result;
  }
  private styleRun(id: string | undefined) { return merge<RunProps>(...this.chain(id).map((style) => style.rPr)); }
  private stylePara(id: string | undefined) { return merge<ParaProps>(...this.chain(id).map((style) => style.pPr)); }
  private styleIs(id: string | undefined, name: string) { return this.chain(id).some((style) => style.name === name || style.id.toLowerCase() === name); }

  private resolveFont(name: string | null | undefined) {
    if (!name) return null;
    const known = KNOWN_FONTS[name.toLowerCase()];
    if (known) return NOTE_FONT_FAMILIES.find((font) => font.id === known)!.value;
    const generic = GENERIC_FAMILIES[this.fontFamilies.get(name.toLowerCase()) ?? ""] ?? "sans-serif";
    return normalizeFontFamily(`'${name}', ${generic}`);
  }
  private resolveSize(halfPoints: number | undefined) {
    return halfPoints ? normalizeFontSize(`${halfPoints / 2}pt`) : null;
  }

  async convert(body: XmlElement): Promise<TiptapDoc> {
    const section = childElements(body, "w:sectPr").at(-1);
    const pageWidth = toInt(childElement(section, "w:pgSz")?.attrs["w:w"]);
    const margins = childElement(section, "w:pgMar");
    if (pageWidth) {
      const width = pageWidth - (toInt(margins?.attrs["w:left"] ?? margins?.attrs["w:start"]) ?? 1440) - (toInt(margins?.attrs["w:right"] ?? margins?.attrs["w:end"]) ?? 1440);
      if (width > 0) this.textWidthTwips = width;
    }
    const content = this.blocks(body);
    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
  }

  result(doc: TiptapDoc): Omit<DocxDocument, "createdAt" | "updatedAt"> {
    return { doc, images: [...this.images.values()], skipped: [...this.skipped] };
  }

  /** Block-level children of the body, a table cell or a content control. */
  private blocks(container: XmlElement): TiptapNode[] {
    const groups: Group[] = [];
    const visit = (parent: XmlElement) => {
      for (const element of childElements(parent)) {
        if (element.name === "w:p") groups.push(this.paragraph(element));
        else if (element.name === "w:tbl") groups.push({ nodes: [this.table(element)] });
        else if (element.name === "w:sdt") visit(childElement(element, "w:sdtContent") ?? element);
        else if (element.name === "w:customXml" || element.name === "w:ins" || element.name === "w:moveTo") visit(element);
        else if (element.name === "m:oMathPara") this.skip("equation");
      }
    };
    visit(container);
    return this.assemble(groups);
  }

  /** Captions join their image, quote paragraphs form blockquotes, numbered paragraphs form lists. */
  private assemble(groups: Group[]): TiptapNode[] {
    const merged: Group[] = [];
    for (const group of groups) {
      const previous = merged.at(-1);
      const image = previous?.nodes.at(-1);
      if (group.caption && previous && !previous.list && image?.type === "image") {
        const caption = group.nodes.find((node) => node.type === "paragraph" || node.type === "heading");
        previous.nodes[previous.nodes.length - 1] = {
          type: IMAGE_FIGURE_NODE_TYPE,
          content: [image, { type: IMAGE_CAPTION_NODE_TYPE, ...(caption?.content?.length ? { content: caption.content } : {}) }],
        };
        continue;
      }
      merged.push(group);
    }

    const output: TiptapNode[] = [];
    const stack: Array<{ list: TiptapNode; info: ListInfo }> = [];
    let quote: TiptapNode | null = null;
    for (const group of merged) {
      if (!group.list) {
        stack.length = 0;
        if (group.quote) {
          if (!quote) { quote = { type: "blockquote", content: [] }; output.push(quote); }
          quote.content!.push(...group.nodes);
        } else {
          quote = null;
          output.push(...group.nodes);
        }
        continue;
      }
      quote = null;
      const info = group.list;
      while (stack.length && stack.at(-1)!.info.level > info.level) stack.pop();
      const top = stack.at(-1);
      if (top && top.info.level === info.level && (top.info.ordered !== info.ordered || top.info.numId !== info.numId)) stack.pop();
      if (!stack.length || stack.at(-1)!.info.level < info.level) {
        const list: TiptapNode = info.ordered
          ? { type: "orderedList", attrs: { start: info.start }, content: [] }
          : { type: "bulletList", content: [] };
        const parent = stack.at(-1);
        if (parent) {
          const item = parent.list.content!.at(-1) as TiptapNode | undefined;
          if (item) item.content!.push(list);
          else { parent.list.content!.push({ type: "listItem", content: [{ type: "paragraph" }, list] }); }
        } else output.push(list);
        stack.push({ list, info });
      }
      const nodes = group.nodes[0]?.type === "paragraph" ? group.nodes : [{ type: "paragraph" }, ...group.nodes];
      // List items hold paragraphs, not headings.
      stack.at(-1)!.list.content!.push({ type: "listItem", content: nodes.map((node, index) => (index === 0 && node.type === "heading" ? { ...node, type: "paragraph", attrs: blockAttrs(node.attrs) } : node)) });
    }
    return output;
  }

  private listInfo(props: ParaProps): ListInfo | undefined {
    if (!props.numId || props.numId === "0") return undefined;
    const num = this.numbering.get(props.numId);
    if (!num) return undefined;
    const level = Math.max(0, Math.min(8, props.ilvl ?? 0));
    const definition = this.abstractNumbering.get(num.abstractId)?.get(level);
    const format = definition?.format ?? "decimal";
    if (format === "none") return undefined;
    const ordered = format !== "bullet";
    // Numbering continues across interruptions, as in Word; deeper levels restart.
    const key = `${props.numId}:${level}`;
    const first = num.starts.get(level) ?? definition?.start ?? 1;
    const current = this.listCounters.has(key) ? this.listCounters.get(key)! + 1 : first;
    this.listCounters.set(key, current);
    for (const counter of this.listCounters.keys()) {
      const [id, depth] = counter.split(":");
      if (id === props.numId && Number(depth) > level) this.listCounters.delete(counter);
    }
    // Letter and roman numbering become numbers: RTNote's lists and Markdown export have no other style.
    return { numId: props.numId, level, ordered, start: current };
  }

  private paragraph(p: XmlElement): Group {
    const pPr = childElement(p, "w:pPr");
    const styleId = childElement(pPr, "w:pStyle")?.attrs["w:val"] ?? this.defaultParagraphStyle;
    const props = merge<ParaProps>(this.docDefaults.pPr, this.stylePara(styleId), this.readPara(pPr));
    const caption = this.styleIs(styleId, "caption");
    const quote = this.styleIs(styleId, "quote") || this.styleIs(styleId, "intense quote");
    const outline = props.outlineLvl !== undefined && props.outlineLvl < 9 ? Math.min(6, props.outlineLvl + 1) : undefined;
    const level = lastOf(this.chain(styleId).map(headingLevel), Boolean) ?? outline;
    // Headings, captions and quotes keep RTNote's own look; only direct formatting is carried over.
    const paragraphRun = merge<RunProps>(
      level || caption || quote ? this.baseline.run : merge<RunProps>(this.docDefaults.rPr, this.styleRun(styleId)),
      this.cellRun,
    );
    const attrs = defined({
      textAlign: props.align && props.align !== "left" ? props.align : undefined,
      lineHeight: props.line && props.line !== this.baseline.para.line ? props.line : undefined,
    });
    const blockOf = (content: Inline[]): TiptapNode => ({
      type: level && !caption ? "heading" : "paragraph",
      attrs: level && !caption ? { level, ...attrs } : Object.keys(attrs).length ? attrs : undefined,
      ...(content.length ? { content } : {}),
    });
    const nodes: TiptapNode[] = [];
    let inline: Inline[] = [];
    const sink = {
      text: (text: string, marks: TiptapMark[]) => {
        if (!text) return;
        const last = inline.at(-1);
        if (last?.type === "text" && JSON.stringify((last as TiptapTextNode).marks ?? []) === JSON.stringify(marks)) {
          (last as TiptapTextNode).text += text;
          return;
        }
        inline.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
      },
      hardBreak: () => { inline.push({ type: "hardBreak" }); },
      block: (node: TiptapNode) => {
        if (inline.some((item) => item.type !== "hardBreak")) nodes.push(blockOf(trimBreaks(inline)));
        inline = [];
        nodes.push(alignImage(node, props.align));
      },
    };
    const droppedBefore = this.dropped;
    this.inline(p, { run: paragraphRun }, sink);
    const onlyDropped = !nodes.length && !inline.some((item) => item.type !== "hardBreak" && !(item.type === "text" && !(item as TiptapTextNode).text.trim())) && this.dropped > droppedBefore;
    if (onlyDropped) return { nodes: [] };
    if (inline.length || !nodes.length) nodes.push(blockOf(trimBreaks(inline)));
    const cleaned = nodes.map((node) => (node.attrs === undefined ? { type: node.type, ...(node.content ? { content: node.content } : {}) } : node));
    return defined({ nodes: cleaned, list: this.listInfo(props), caption: caption || undefined, quote: quote || undefined }) as Group;
  }

  private inline(container: XmlElement, context: { run: RunProps; link?: string; hyperlink?: boolean }, sink: InlineSink) {
    for (const element of childElements(container)) {
      switch (element.name) {
        case "w:r": this.run(element, context, sink); break;
        case "w:hyperlink": {
          const rel = element.attrs["r:id"] ? this.rels.get(element.attrs["r:id"]) : undefined;
          const href = rel?.external && SAFE_LINK.test(rel.target.trim()) ? rel.target.trim() : undefined;
          this.inline(element, { ...context, link: href ?? context.link, hyperlink: true }, sink);
          break;
        }
        case "w:fldSimple": {
          const link = fieldLink(element.attrs["w:instr"] ?? "");
          this.inline(element, { ...context, link: link ?? context.link, hyperlink: Boolean(link) || context.hyperlink }, sink);
          break;
        }
        case "w:sdt": this.inline(childElement(element, "w:sdtContent") ?? element, context, sink); break;
        case "w:ins": case "w:moveTo": case "w:smartTag": case "w:customXml": case "w:dir": case "w:bdo":
          this.inline(element, context, sink); break;
        case "m:oMath": case "m:oMathPara": this.skip("equation"); break;
        default: break;
      }
    }
  }

  private run(r: XmlElement, context: { run: RunProps; link?: string; hyperlink?: boolean }, sink: InlineSink) {
    const rPr = childElement(r, "w:rPr");
    const characterStyle = childElement(rPr, "w:rStyle")?.attrs["w:val"];
    // A link draws its own colour and underline; Word's Hyperlink style is not copied.
    const characterRun = context.hyperlink && this.styleIs(characterStyle, "hyperlink") ? {} : this.styleRun(characterStyle);
    const props = merge<RunProps>(context.run, characterRun, this.readRun(rPr));
    const field = this.fields.at(-1);
    const link = field?.result && field.link ? field.link : context.link;
    const marks = this.marks(props, link);
    const visit = (parent: XmlElement) => {
      for (const element of childElements(parent)) {
        const inField = this.fields.length > 0 && !this.fields.at(-1)!.result;
        switch (element.name) {
          case "w:fldChar": {
            const type = element.attrs["w:fldCharType"];
            if (type === "begin") this.fields.push({ instr: "", result: false });
            else if (type === "separate" && this.fields.length) {
              const current = this.fields.at(-1)!;
              current.result = true;
              current.link = fieldLink(current.instr);
            } else if (type === "end") this.fields.pop();
            break;
          }
          case "w:instrText": if (this.fields.length) this.fields.at(-1)!.instr += textContent(element); break;
          case "w:t": if (!inField && !props.hidden) sink.text(textContent(element), this.fieldMarks(props, context.link)); break;
          case "w:tab": case "w:ptab": if (!inField && !props.hidden) sink.text("\t", this.fieldMarks(props, context.link)); break;
          case "w:noBreakHyphen": if (!inField) sink.text("‑", marks); break;
          case "w:br": case "w:cr": {
            const type = element.attrs["w:type"];
            if (!inField && type !== "page" && type !== "column") sink.hardBreak();
            break;
          }
          case "w:drawing": if (!inField) this.drawing(element, sink); break;
          case "w:pict": if (!inField) this.vmlPicture(element, sink); break;
          case "mc:AlternateContent": {
            // The first choice is the modern markup; fallbacks repeat it for older readers.
            const choice = childElement(element, "mc:Choice") ?? childElement(element, "mc:Fallback");
            if (choice) visit(choice);
            break;
          }
          case "w:footnoteReference": this.skip("footnote"); break;
          case "w:endnoteReference": this.skip("endnote"); break;
          case "w:object": this.skip("embeddedObject"); break;
          default: break;
        }
      }
    };
    visit(r);
  }

  /** Marks for field result text pick up HYPERLINK fields opened in earlier runs. */
  private fieldMarks(props: RunProps, contextLink: string | undefined) {
    const field = this.fields.at(-1);
    return this.marks(props, field?.result && field.link ? field.link : contextLink);
  }

  private marks(props: RunProps, link: string | undefined): TiptapMark[] {
    const marks: TiptapMark[] = [];
    if (props.bold) marks.push({ type: "bold" });
    if (props.italic) marks.push({ type: "italic" });
    if (props.strike) marks.push({ type: "strike" });
    if (props.underline && !link) marks.push({ type: "underline" });
    if (link) marks.push({ type: "link", attrs: { href: link } });
    const baselineFont = this.resolveFont(this.baseline.run.font);
    // Without an explicit size Word uses 10pt.
    const baselineSize = this.resolveSize(this.baseline.run.size ?? 20);
    const font = this.resolveFont(props.font);
    const size = this.resolveSize(props.size ?? 20);
    const style = defined({
      color: props.color && props.color !== (this.baseline.run.color ?? null) && !link ? normalizeTextColor(props.color) ?? undefined : undefined,
      backgroundColor: props.background ? normalizeTextColor(props.background) ?? undefined : undefined,
      fontFamily: font && font !== baselineFont ? font : undefined,
      fontSize: size && size !== baselineSize && size !== NOTE_DEFAULT_FONT_SIZE ? size : undefined,
    });
    if (Object.keys(style).length) marks.push({ type: "textStyle", attrs: style });
    return marks;
  }

  private image(part: string, cx: number | undefined, alt: string, title?: string): TiptapNode | null {
    const mimeType = this.pkg.contentType(part).toLowerCase();
    if (!RENDERABLE_IMAGE_TYPES.has(mimeType)) { this.skip("unsupportedImage"); return null; }
    if (!this.images.has(part)) {
      this.images.set(part, { part, filename: part.split("/").at(-1) ?? part, mimeType, byteSize: this.pkg.size(part) });
    }
    const width = cx && cx > 0 ? parseImageWidth(cx / (this.textWidthTwips * EMU_PER_TWIP) * 100) : null;
    return { type: "image", attrs: defined({ src: docxResourceSource(part), alt: alt || undefined, title: title || undefined, width: width ?? undefined }) };
  }

  private drawing(drawing: XmlElement, sink: InlineSink) {
    for (const frame of childElements(drawing)) {
      if (frame.name !== "wp:inline" && frame.name !== "wp:anchor") continue;
      const graphic = findElement(frame, "a:graphicData");
      const uri = graphic?.attrs.uri ?? "";
      const docPr = childElement(frame, "wp:docPr");
      if (uri.endsWith("/picture")) {
        const blip = findElement(graphic, "a:blip");
        const embed = blip?.attrs["r:embed"];
        const rel = embed ? this.rels.get(embed) : undefined;
        if (!rel || rel.external) { this.skip("linkedImage"); continue; }
        const node = this.image(rel.target, toInt(childElement(frame, "wp:extent")?.attrs.cx), docPr?.attrs.descr ?? "", docPr?.attrs.title);
        if (!node) continue;
        const horizontal = childElement(childElement(frame, "wp:positionH"), "wp:align");
        const align = horizontal ? textContentOrAttr(horizontal) : undefined;
        if (align === "center" || align === "right") node.attrs = { ...node.attrs, alignment: align };
        sink.block(node);
      } else if (/chart/.test(uri)) this.skip("chart");
      else if (findElement(graphic, "w:txbxContent")) this.skip("textBox");
      else this.skip("drawing");
    }
  }

  /** Legacy VML pictures (`v:imagedata`) from older Word versions. */
  private vmlPicture(pict: XmlElement, sink: InlineSink) {
    const shape = findElement(pict, "v:shape");
    const data = findElement(pict, "v:imagedata");
    if (findElement(pict, "w:txbxContent")) { this.skip("textBox"); return; }
    const rel = data?.attrs["r:id"] ? this.rels.get(data.attrs["r:id"]) : undefined;
    if (!rel) { if (data) this.skip("linkedImage"); return; }
    if (rel.external) { this.skip("linkedImage"); return; }
    const width = /(?:^|;)\s*width\s*:\s*([\d.]+)pt/i.exec(shape?.attrs.style ?? "");
    const node = this.image(rel.target, width ? Number(width[1]) * 12700 : undefined, data?.attrs["o:title"] ?? "");
    if (node) sink.block(node);
  }

  private table(tbl: XmlElement): TiptapNode {
    const tblPr = childElement(tbl, "w:tblPr");
    const styleId = childElement(tblPr, "w:tblStyle")?.attrs["w:val"] ?? this.defaultTableStyle;
    const chain = this.chain(styleId);
    const tableBorders = merge<Borders>(...chain.map((style) => style.borders), readBorders(childElement(tblPr, "w:tblBorders")));
    const look = childElement(tblPr, "w:tblLook");
    const lookBits = Number.parseInt(look?.attrs["w:val"] ?? "0", 16) || 0;
    const lookOn = (name: string, bit: number) => {
      const value = look?.attrs[name];
      return value !== undefined ? !/^(?:0|false|off)$/i.test(value) : Boolean(lookBits & bit);
    };
    const firstRowStyle = lastOf(chain, (style) => Boolean(style.firstRow))?.firstRow;
    const firstColStyle = lastOf(chain, (style) => Boolean(style.firstCol))?.firstCol;
    const styledHeaderRow = Boolean(firstRowStyle && (firstRowStyle.bold || firstRowStyle.fill) && lookOn("w:firstRow", 0x20));
    const styledHeaderColumn = Boolean(firstColStyle && (firstColStyle.bold || firstColStyle.fill) && lookOn("w:firstColumn", 0x80));
    const grid = childElements(childElement(tbl, "w:tblGrid"), "w:gridCol").map((col) => toInt(col.attrs["w:w"]) ?? 0);

    const rowElements: XmlElement[] = [];
    const collectRows = (parent: XmlElement) => {
      for (const element of childElements(parent)) {
        if (element.name === "w:tr") rowElements.push(element);
        else if (element.name === "w:sdt") collectRows(childElement(element, "w:sdtContent") ?? element);
        else if (element.name === "w:customXml" || element.name === "w:ins") collectRows(element);
      }
    };
    collectRows(tbl);

    const rows: TiptapNode[] = [];
    const active: Array<TiptapNode | null> = [];
    rowElements.forEach((tr, rowIndex) => {
      const trPr = childElement(tr, "w:trPr");
      const headerRow = Boolean(toggle(childElement(trPr, "w:tblHeader"))) || (rowIndex === 0 && styledHeaderRow);
      const cells: TiptapNode[] = [];
      const extended: TiptapNode[] = [];
      let column = 0;
      const before = toInt(childElement(trPr, "w:gridBefore")?.attrs["w:val"]) ?? 0;
      if (before > 0) {
        cells.push({ type: "tableCell", attrs: { colspan: before, rowspan: 1, colwidth: null, borderColor: CELL_BORDER_NONE }, content: [{ type: "paragraph" }] });
        for (let index = 0; index < before; index++) active[index] = null;
        column = before;
      }
      const cellElements: XmlElement[] = [];
      const collectCells = (parent: XmlElement) => {
        for (const element of childElements(parent)) {
          if (element.name === "w:tc") cellElements.push(element);
          else if (element.name === "w:sdt") collectCells(childElement(element, "w:sdtContent") ?? element);
          else if (element.name === "w:customXml") collectCells(element);
        }
      };
      collectCells(tr);
      for (const tc of cellElements) {
        const tcPr = childElement(tc, "w:tcPr");
        const span = Math.max(1, Math.min(100, toInt(childElement(tcPr, "w:gridSpan")?.attrs["w:val"]) ?? 1));
        const vMerge = childElement(tcPr, "w:vMerge");
        const restart = vMerge?.attrs["w:val"] === "restart";
        if (vMerge && !restart && active[column]) {
          const start = active[column]!;
          start.attrs = { ...start.attrs, rowspan: Number(start.attrs!.rowspan) + 1 };
          extended.push(start);
          column += span;
          continue;
        }
        const borders = merge<Borders>(tableBorders, readBorders(childElement(tcPr, "w:tcBorders")));
        const headerColumn = column === 0 && styledHeaderColumn;
        const header = headerRow || headerColumn;
        const conditionalFill = (headerRow && rowIndex === 0 && styledHeaderRow ? firstRowStyle?.fill : undefined)
          ?? (headerColumn ? firstColStyle?.fill : undefined);
        const widths = grid.slice(column, column + span);
        const colwidth = widths.length === span && widths.every((width) => width > 0) ? widths.map((width) => Math.round(width / 15)) : null;
        const styledRow = rowIndex === 0 && styledHeaderRow;
        this.cellRun = defined({ color: (styledRow ? firstRowStyle?.color : undefined) ?? (headerColumn ? firstColStyle?.color : undefined) ?? undefined });
        const content = this.blocks(tc);
        this.cellRun = {};
        const cell: TiptapNode = {
          type: header ? "tableHeader" : "tableCell",
          attrs: {
            colspan: span, rowspan: 1, colwidth,
            backgroundColor: readShading(childElement(tcPr, "w:shd")) ?? conditionalFill ?? null,
            borderColor: cellBorder([
              borders.top ?? (rowIndex > 0 ? borders.insideH : undefined),
              borders.left ?? (column > 0 ? borders.insideV : undefined),
              borders.bottom ?? borders.insideH,
              borders.right ?? borders.insideV,
            ]),
          },
          content: content.length ? content : [{ type: "paragraph" }],
        };
        cells.push(cell);
        for (let index = column; index < column + span; index++) active[index] = restart ? cell : null;
        column += span;
      }
      if (cells.length) rows.push({ type: "tableRow", content: cells });
      else for (const cell of new Set(extended)) cell.attrs = { ...cell.attrs, rowspan: Number(cell.attrs!.rowspan) - 1 };
    });
    return { type: "table", content: rows.length ? rows : [{ type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] }] }] };
  }
}

type InlineSink = { text: (text: string, marks: TiptapMark[]) => void; hardBreak: () => void; block: (node: TiptapNode) => void };

const textContentOrAttr = (element: XmlElement) => element.children.filter((child) => typeof child === "string").join("").trim() || undefined;

const fieldLink = (instruction: string) => {
  const match = /^\s*HYPERLINK\s+(?:"([^"]+)"|(\S+))/i.exec(instruction);
  const href = (match?.[1] ?? match?.[2])?.trim();
  return href && SAFE_LINK.test(href) ? href : undefined;
};

const blockAttrs = (attrs: Record<string, unknown> | undefined) => {
  const result = defined({ textAlign: attrs?.textAlign, lineHeight: attrs?.lineHeight });
  return Object.keys(result).length ? result : undefined;
};

const trimBreaks = (inline: Inline[]) => {
  let start = 0, end = inline.length;
  while (start < end && inline[start]!.type === "hardBreak") start++;
  while (end > start && inline[end - 1]!.type === "hardBreak") end--;
  return inline.slice(start, end);
};

/** A centred or right-aligned image paragraph keeps that alignment on the image. */
const alignImage = (node: TiptapNode, align: string | null | undefined) => {
  if (node.type !== "image" || node.attrs?.alignment) return node;
  return align === "center" || align === "right" ? { ...node, attrs: { ...node.attrs, alignment: align } } : node;
};

/** Reads one .docx file. Throws `invalidDocx` when the file is not a Word document. */
export const readDocx = async (blob: Blob): Promise<DocxDocument> => {
  const pkg = await DocxPackage.open(blob);
  try {
    const documentPath = await mainDocumentPath(pkg);
    const document = documentPath ? await pkg.xml(documentPath) : undefined;
    const body = childElement(document, "w:body");
    if (!documentPath || !body) throw new Error("invalidDocx");
    const converter = new DocxConverter(pkg, documentPath);
    await converter.load();
    const doc = await converter.convert(body);
    const core = await pkg.xml("docProps/core.xml").catch(() => undefined);
    return {
      ...converter.result(doc),
      createdAt: importTime(textContent(childElement(core, "dcterms:created"))),
      updatedAt: importTime(textContent(childElement(core, "dcterms:modified"))),
    };
  } finally {
    await pkg.close();
  }
};

/** Streams one image part of a .docx file. */
export async function* readDocxPart(blob: Blob, part: string, signal?: AbortSignal) {
  const pkg = await DocxPackage.open(blob);
  try { yield* pkg.bytes(part, signal); }
  finally { await pkg.close(); }
}
