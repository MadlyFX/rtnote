import { BlobReader, ZipReader, type FileEntry } from "@zip.js/zip.js/index-native.js";
import sax from "sax";
import { dirname, normalPath } from "./sources";
import { mimeFromName } from "./metadata";

/**
 * Reads the parts of a Word (.docx) package. The package is a ZIP of XML
 * parts; zip.js and sax are the codecs the import pipeline already ships, and
 * both run in browsers and Workers without a DOM. sax does not fetch DTDs or
 * resolve external entities.
 */

export type XmlElement = { name: string; attrs: Record<string, string>; children: XmlChild[] };
export type XmlChild = XmlElement | string;

/** XML parts above this size are refused rather than inflated into memory. */
const MAX_XML_PART_BYTES = 48 * 1024 * 1024;
/** Text is kept only where WordprocessingML stores visible or field text. */
const TEXT_ELEMENTS = new Set(["w:t", "w:instrText", "dc:title", "dcterms:created", "dcterms:modified"]);

export const isElement = (node: XmlChild | undefined): node is XmlElement => typeof node === "object" && node !== null;
export const childElements = (element: XmlElement | undefined, name?: string) =>
  (element?.children ?? []).filter((child): child is XmlElement => isElement(child) && (name === undefined || child.name === name));
export const childElement = (element: XmlElement | undefined, name: string) =>
  element?.children.find((child): child is XmlElement => isElement(child) && child.name === name);
export const textContent = (element: XmlElement | undefined): string =>
  (element?.children ?? []).map((child) => (typeof child === "string" ? child : textContent(child))).join("");
/** First descendant with the given name, depth first. */
export const findElement = (element: XmlElement | undefined, name: string): XmlElement | undefined => {
  for (const child of childElements(element)) {
    if (child.name === name) return child;
    const found = findElement(child, name);
    if (found) return found;
  }
  return undefined;
};

export const parseXml = (text: string): XmlElement => {
  const parser = sax.parser(true, { trim: false, normalize: false });
  const root: XmlElement = { name: "#document", attrs: {}, children: [] };
  const stack: XmlElement[] = [root];
  parser.onopentag = (tag) => {
    const element: XmlElement = { name: tag.name, attrs: tag.attributes as Record<string, string>, children: [] };
    stack.at(-1)!.children.push(element);
    stack.push(element);
  };
  parser.onclosetag = () => { stack.pop(); };
  const onText = (value: string) => {
    const parent = stack.at(-1)!;
    if (TEXT_ELEMENTS.has(parent.name)) parent.children.push(value);
  };
  parser.ontext = onText;
  parser.oncdata = onText;
  parser.write(text).close();
  const document = childElements(root)[0];
  if (!document) throw new Error("invalidDocx");
  return document;
};

export type DocxRelationship = { id: string; type: string; target: string; external: boolean };

export class DocxPackage {
  private constructor(
    private reader: ZipReader<Blob>,
    private entries: Map<string, FileEntry>,
    private contentTypes: { defaults: Map<string, string>; overrides: Map<string, string> },
  ) {}

  static async open(blob: Blob) {
    const reader = new ZipReader(new BlobReader(blob), { useWebWorkers: false });
    const entries = new Map<string, FileEntry>();
    try {
      for (const entry of await reader.getEntries()) {
        if (entry.directory) continue;
        try { entries.set(normalPath(entry.filename), entry); } catch { /* Paths outside the package are never read. */ }
      }
    } catch {
      await reader.close().catch(() => {});
      throw new Error("invalidDocx");
    }
    const pkg = new DocxPackage(reader, entries, { defaults: new Map(), overrides: new Map() });
    const types = await pkg.xml("[Content_Types].xml");
    if (!types) { await pkg.close(); throw new Error("invalidDocx"); }
    for (const item of childElements(types, "Default")) pkg.contentTypes.defaults.set((item.attrs.Extension ?? "").toLowerCase(), item.attrs.ContentType ?? "");
    for (const item of childElements(types, "Override")) pkg.contentTypes.overrides.set((item.attrs.PartName ?? "").replace(/^\//, ""), item.attrs.ContentType ?? "");
    return pkg;
  }

  has(path: string) { return this.entries.has(path); }
  size(path: string) { return this.entries.get(path)?.uncompressedSize ?? 0; }

  contentType(path: string) {
    const override = this.contentTypes.overrides.get(path);
    if (override) return override;
    const extension = path.split(".").at(-1)?.toLowerCase() ?? "";
    return this.contentTypes.defaults.get(extension) || mimeFromName(path);
  }

  async xml(path: string): Promise<XmlElement | undefined> {
    const entry = this.entries.get(path);
    if (!entry) return undefined;
    if (entry.uncompressedSize > MAX_XML_PART_BYTES) throw new Error("docxPartTooLarge");
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.bytes(path)) chunks.push(chunk);
    const text = new TextDecoder().decode(await new Blob(chunks as BlobPart[]).arrayBuffer()).replace(/^﻿/, "");
    return parseXml(text);
  }

  /** Relationships of a part, keyed by id, with targets resolved to package paths. */
  async relationships(part: string): Promise<Map<string, DocxRelationship>> {
    const folder = dirname(part);
    const name = part.slice(folder ? folder.length + 1 : 0);
    const rels = await this.xml([folder, "_rels", `${name}.rels`].filter(Boolean).join("/"));
    const result = new Map<string, DocxRelationship>();
    for (const item of childElements(rels, "Relationship")) {
      const id = item.attrs.Id;
      const target = item.attrs.Target ?? "";
      if (!id) continue;
      const external = item.attrs.TargetMode === "External";
      let resolved = target;
      if (!external) {
        try { resolved = normalPath(target.startsWith("/") ? target.slice(1) : [folder, target].filter(Boolean).join("/")); }
        catch { continue; }
      }
      result.set(id, { id, type: item.attrs.Type ?? "", target: resolved, external });
    }
    return result;
  }

  /** Streams one part without inflating it into a single buffer. */
  async *bytes(path: string, signal?: AbortSignal): AsyncGenerator<Uint8Array<ArrayBuffer>> {
    signal?.throwIfAborted();
    const entry = this.entries.get(path);
    if (!entry) throw new Error("missingResource");
    let output!: TransformStreamDefaultController<Uint8Array>;
    const stream = new TransformStream<Uint8Array, Uint8Array>({ start(controller) { output = controller; } });
    const writing = entry.getData(stream.writable, { signal }).then(() => null as unknown).catch((error: unknown) => { output.error(error); return error; });
    const reader = stream.readable.getReader();
    try {
      while (true) {
        signal?.throwIfAborted();
        const next = await reader.read();
        if (next.done) break;
        yield new Uint8Array(next.value);
      }
      const error = await writing;
      if (error) throw error;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      await writing;
    }
  }

  async close() { await this.reader.close().catch(() => {}); }
}

export const OFFICE_DOCUMENT_REL = /\/officeDocument$/;

/** Path of the main document part, from the package relationships. */
export const mainDocumentPath = async (pkg: DocxPackage) => {
  const rels = await pkg.relationships("");
  for (const rel of rels.values()) if (!rel.external && OFFICE_DOCUMENT_REL.test(rel.type)) return rel.target;
  return pkg.has("word/document.xml") ? "word/document.xml" : undefined;
};
