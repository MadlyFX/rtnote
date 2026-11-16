import type { TiptapDoc, TiptapNode, TiptapTextNode } from "../content";
import type { ImportResource } from "./types";

/**
 * Image `src` placeholder in an imported DOCX document until the import has
 * uploaded the package part as a note resource. Kept apart from the parser so
 * the write step does not load zip.js or sax.
 */
export const DOCX_RESOURCE_SCHEME = "docx-resource:";
export const docxResourceSource = (part: string) => `${DOCX_RESOURCE_SCHEME}${part}`;

/** Points image nodes at their uploaded URLs; an image without an upload is dropped. */
export const rewriteDocxImageSources = (doc: TiptapDoc, resources: readonly ImportResource[], urls: Record<string, string>): TiptapDoc => {
  const byPart = new Map<string, string>();
  for (const resource of resources) {
    if (resource.docxPart && Object.hasOwn(urls, resource.key)) byPart.set(resource.docxPart, urls[resource.key]!);
  }
  const visit = (node: TiptapNode | TiptapTextNode): TiptapNode | TiptapTextNode | null => {
    if (node.type === "text") return node;
    const element = node as TiptapNode;
    const src = element.attrs?.src;
    if (element.type === "image" && typeof src === "string" && src.startsWith(DOCX_RESOURCE_SCHEME)) {
      const url = byPart.get(src.slice(DOCX_RESOURCE_SCHEME.length));
      return url ? { ...element, attrs: { ...element.attrs, src: url } } : null;
    }
    if (!element.content) return element;
    return { ...element, content: element.content.map(visit).filter((child): child is TiptapNode | TiptapTextNode => child !== null) };
  };
  return { ...doc, content: doc.content.map(visit).filter((node): node is TiptapNode => node !== null) };
};
