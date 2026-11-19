import { toMarkdown } from "mdast-util-to-markdown";
import { ATTACHMENT_LABEL_PREFIX_PATTERN } from "./rtnote-legacy-values";

const RESOURCE_PATH_PATTERN = /\/api\/v1\/resources\/([^/]+)\/blob(?:$|[?#])/;

// Resource nodes serialize without a surrounding paragraph/phrasing context.
// Escape entity-like label text there without changing destinations or titles.
export const resourceNodeToMarkdown = (node: Parameters<typeof toMarkdown>[0]): string => toMarkdown(node, {
  unsafe: [{ character: "&", after: "[#A-Za-z]", inConstruct: "label",
    notInConstruct: ["destinationRaw", "destinationLiteral", "titleQuote", "titleApostrophe"] }],
}).trimEnd();

export const resourceLinkToMarkdown = (label: string, url: string): string => resourceNodeToMarkdown({
  type: "link", url, children: [{ type: "text", value: label }],
});

export const getResourceIdFromUrl = (href: string): string | null => {
  if (href.startsWith("rtnote-resource://")) {
    try {
      const parsed = new URL(href);
      const resourceId = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      return resourceId || null;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(href, "http://rtnote.local");
    const match = parsed.pathname.match(RESOURCE_PATH_PATTERN);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

export const getAttachmentFilenameFromLabel = (label: string) =>
  label.replace(ATTACHMENT_LABEL_PREFIX_PATTERN, "").trim();

/** Match API, desktop protocol, and identical staged URLs for the same stored file. */
export const resourceUrlsReferToSameAttachment = (left: string, right: string) => {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftId = getResourceIdFromUrl(left);
  const rightId = getResourceIdFromUrl(right);
  return Boolean(leftId && rightId && leftId === rightId);
};
