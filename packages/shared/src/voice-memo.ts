import { mergeAttributes, Node, type JSONContent } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { normalizeAttachmentByteSize } from "./attachment-metadata";
import { resourceLinkToMarkdown } from "./resource-links";
import {
  VOICE_MEMO_NODE_TYPE,
  VOICE_MEMO_TOKEN,
  normalizeVoiceMemoDuration,
  formatVoiceMemoDuration,
} from "./voice-memo-names";

export * from "./voice-memo-names";

/**
 * A voice memo: an audio recording saved as an ordinary note resource, plus an
 * optional title and transcript. Everything lives in the node's attributes so
 * the block moves, copies and syncs as one unit; search text, share pages and
 * exports read the title and transcript from those attributes.
 *
 * A memo without a `url` is a recording that has not finished uploading yet.
 * `clientId` ties such a block to the recorder that will fill it in and is
 * cleared once the recording is saved.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    voiceMemo: {
      /** Inserts a voice memo block at the selection. */
      insertVoiceMemo: (attrs?: Partial<VoiceMemoAttrs>) => ReturnType;
    };
  }
}

export type VoiceMemoAttrs = {
  url: string;
  filename: string;
  mimeType: string;
  byteSize: number | null;
  durationMs: number | null;
  title: string;
  transcript: string;
  clientId: string;
};

const stringAttr = (value: unknown) => (typeof value === "string" ? value : "");

/** Reads voice memo attributes from untrusted JSON. */
export const readVoiceMemoAttrs = (attrs: Record<string, unknown> | null | undefined): VoiceMemoAttrs => ({
  url: stringAttr(attrs?.url),
  filename: stringAttr(attrs?.filename),
  mimeType: stringAttr(attrs?.mimeType),
  byteSize: normalizeAttachmentByteSize(attrs?.byteSize),
  durationMs: normalizeVoiceMemoDuration(attrs?.durationMs),
  title: stringAttr(attrs?.title),
  transcript: stringAttr(attrs?.transcript),
  clientId: stringAttr(attrs?.clientId),
});

/** Title and transcript text that search indexes. */
export const voiceMemoSearchText = (attrs: Record<string, unknown> | null | undefined) => {
  const { title, transcript } = readVoiceMemoAttrs(attrs);
  return [title, transcript].map((value) => value.trim()).filter(Boolean).join(" ");
};

// Markdown form. Other renderers show the link and the transcript and hide the
// comments; RTNote reads the metadata back from the opening comment.
//
//   <!-- rtnote-voice-memo {"durationMs":42000,"title":"Standup",...} -->
//   [Standup (0:42)](/api/v1/resources/abc/blob)
//
//   Transcript text…
//   <!-- /rtnote-voice-memo -->
const OPEN_MARKER = "<!-- rtnote-voice-memo ";
const CLOSE_MARKER = "<!-- /rtnote-voice-memo -->";
const BLOCK_PATTERN = /^ {0,3}<!-- rtnote-voice-memo (\{.*?\}) -->[ \t]*\n([\s\S]*?)<!-- \/rtnote-voice-memo -->[ \t]*(?:\n|$)/;
const LINK_LINE_PATTERN = /^\[(?:\\.|[^[\]\\])*\]\(([^\s)]+)(?:\s+"[^"]*")?\)[ \t]*$/;

// Keep comment terminators out of the metadata and transcript.
const encodeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
const encodeTranscript = (value: string) => value.replace(/-->/g, "--&gt;");
const decodeTranscript = (value: string) => value.replace(/--&gt;/g, "-->");

/** The visible link label: the title, or a generic label, with the duration. */
export const voiceMemoLinkLabel = (attrs: Pick<VoiceMemoAttrs, "title" | "durationMs">, fallbackLabel = "Voice memo") => {
  const name = attrs.title.trim() || fallbackLabel;
  return attrs.durationMs === null ? name : `${name} (${formatVoiceMemoDuration(attrs.durationMs)})`;
};

export const voiceMemoToMarkdown = (rawAttrs: Record<string, unknown> | null | undefined) => {
  const attrs = readVoiceMemoAttrs(rawAttrs);
  if (!attrs.url) return "";
  const metadata: Record<string, unknown> = {};
  if (attrs.filename) metadata.filename = attrs.filename;
  if (attrs.mimeType) metadata.mimeType = attrs.mimeType;
  if (attrs.byteSize !== null) metadata.byteSize = attrs.byteSize;
  if (attrs.durationMs !== null) metadata.durationMs = attrs.durationMs;
  if (attrs.title) metadata.title = attrs.title;
  const transcript = attrs.transcript.trim();
  return [
    `${OPEN_MARKER}${encodeJson(metadata)} -->`,
    resourceLinkToMarkdown(voiceMemoLinkLabel(attrs), attrs.url),
    ...(transcript ? ["", encodeTranscript(transcript)] : []),
    CLOSE_MARKER,
  ].join("\n");
};

type VoiceMemoToken = { type: string; raw: string; attrs: VoiceMemoAttrs };

/** Parses one Markdown voice memo block at the start of `source`. */
export const readVoiceMemoMarkdown = (source: string): VoiceMemoToken | undefined => {
  const match = BLOCK_PATTERN.exec(source);
  if (!match) return undefined;
  let metadata: Record<string, unknown>;
  try {
    const parsed = JSON.parse(match[1]!) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    metadata = parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
  const lines = match[2]!.replace(/\r\n?/g, "\n").split("\n");
  const linkIndex = lines.findIndex((line) => line.trim() !== "");
  const link = linkIndex === -1 ? null : LINK_LINE_PATTERN.exec(lines[linkIndex]!.trim());
  if (!link) return undefined;
  const transcript = decodeTranscript(lines.slice(linkIndex + 1).join("\n").trim());
  return {
    type: VOICE_MEMO_TOKEN,
    raw: match[0],
    attrs: { ...readVoiceMemoAttrs(metadata), url: link[1]!, transcript, clientId: "" },
  };
};

export const VoiceMemo = Node.create({
  name: VOICE_MEMO_NODE_TYPE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      url: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-url") || "",
        renderHTML: (attributes) => (attributes.url ? { "data-url": String(attributes.url) } : {}),
      },
      filename: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-filename") || "",
        renderHTML: (attributes) => (attributes.filename ? { "data-filename": String(attributes.filename) } : {}),
      },
      mimeType: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mime-type") || "",
        renderHTML: (attributes) => (attributes.mimeType ? { "data-mime-type": String(attributes.mimeType) } : {}),
      },
      byteSize: {
        default: null,
        parseHTML: (element) => normalizeAttachmentByteSize(element.getAttribute("data-byte-size")),
        renderHTML: (attributes) => {
          const byteSize = normalizeAttachmentByteSize(attributes.byteSize);
          return byteSize === null ? {} : { "data-byte-size": String(byteSize) };
        },
      },
      durationMs: {
        default: null,
        parseHTML: (element) => normalizeVoiceMemoDuration(element.getAttribute("data-duration-ms")),
        renderHTML: (attributes) => {
          const durationMs = normalizeVoiceMemoDuration(attributes.durationMs);
          return durationMs === null ? {} : { "data-duration-ms": String(durationMs) };
        },
      },
      // Title and transcript are rendered as visible children, and read back from them.
      title: {
        default: "",
        parseHTML: (element) => element.querySelector("[data-voice-memo-title]")?.textContent ?? "",
        rendered: false,
      },
      transcript: {
        default: "",
        parseHTML: (element) => element.querySelector("[data-voice-memo-transcript]")?.textContent ?? "",
        rendered: false,
      },
      clientId: { default: "", rendered: false, parseHTML: () => "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="rtnote-voice-memo"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = readVoiceMemoAttrs(node.attrs);
    const children: DOMOutputSpec[] = [];
    if (attrs.title) children.push(["p", { "data-voice-memo-title": "", class: "rtnote-voice-memo-title" }, attrs.title]);
    if (attrs.url) {
      const file = attrs.filename || voiceMemoLinkLabel(attrs);
      const duration = attrs.durationMs === null ? "" : ` · ${formatVoiceMemoDuration(attrs.durationMs)}`;
      children.push(["p", { "data-voice-memo-file": "", class: "rtnote-voice-memo-file" }, `${file}${duration}`]);
      children.push(["audio", { controls: "", preload: "metadata", src: attrs.url }, ["a", { href: attrs.url }, file]]);
    }
    if (attrs.transcript) {
      children.push(["p", { "data-voice-memo-transcript": "", class: "rtnote-voice-memo-transcript" }, attrs.transcript]);
    }
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-type": "rtnote-voice-memo",
      class: "rtnote-voice-memo",
    }), ...children] as DOMOutputSpec;
  },

  addCommands() {
    return {
      // Never replaces the selection: a selected block (for example another
      // voice memo) or selected text stays, and the memo goes after it.
      insertVoiceMemo: (attrs = {}) => ({ state, commands }) => {
        const { selection } = state;
        const target = selection instanceof NodeSelection || !selection.empty
          ? selection.to
          : { from: selection.from, to: selection.to };
        return commands.insertContentAt(target, { type: this.name, attrs: { ...attrs } });
      },
    };
  },

  renderMarkdown: (node: JSONContent) => voiceMemoToMarkdown(node.attrs),
  markdownTokenName: VOICE_MEMO_TOKEN,
  markdownTokenizer: {
    name: VOICE_MEMO_TOKEN,
    level: "block",
    start: (source: string) => source.indexOf(OPEN_MARKER),
    tokenize: (source: string) => readVoiceMemoMarkdown(source),
  },
  parseMarkdown: (token) => ({
    type: VOICE_MEMO_NODE_TYPE,
    attrs: (token as unknown as VoiceMemoToken).attrs,
  }),
});

