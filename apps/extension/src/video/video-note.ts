import { formatTimestamp, sectionsFromChapters } from "./transcript";
import type { VideoCapture, VideoNoteToast } from "./types";

export type VideoNoteLabels = {
  source: string;
  platform: string;
  captions: string;
  capturedAt: string;
  outline: string;
  transcript: string;
  coverAlt: string;
  youtube: string;
  bilibili: string;
  captionsAuto: string;
  captionsCreator: string;
  noCaptions: string;
  fallbackTitle: string;
};

const COVER_PLACEHOLDER = "EDGEVERRESOURCEID";

export const videoNoteTitle = (title: string, fallback: string) => {
  const clean = title.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const value = clean || fallback;
  return value.length > 160 ? value.slice(0, 160).trim() : value;
};

const escapeHtmlText = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const plain = (value: string) => escapeHtmlText(value.replace(/\s+/g, " ").trim()).replace(/\]\(/g, "] (");

const linkLabel = (value: string) => plain(value).replace(/\[/g, "［").replace(/\]/g, "］");

const timestampUrl = (capture: VideoCapture, seconds: number) => {
  const time = Math.max(0, Math.floor(seconds));
  if (capture.platform === "youtube") {
    return capture.sourceUrl.includes("/shorts/")
      ? `${capture.sourceUrl}?t=${time}`
      : `${capture.sourceUrl}&t=${time}s`;
  }
  return capture.sourceUrl.includes("?")
    ? `${capture.sourceUrl}&t=${time}`
    : `${capture.sourceUrl}?t=${time}`;
};

const platformLine = (capture: VideoCapture, labels: VideoNoteLabels) => {
  const bits = [capture.platform === "bilibili" ? labels.bilibili : labels.youtube];
  if (capture.partIndex) {
    bits.push([`P${capture.partIndex}`, capture.partTitle].filter(Boolean).join(" "));
  }
  if (capture.duration > 0) bits.push(formatTimestamp(capture.duration));
  return bits.join(" · ");
};

const captionLabel = (capture: VideoCapture, labels: VideoNoteLabels) => {
  if (!capture.cues.length || !capture.subtitleOrigin) return "";
  return capture.subtitleOrigin === "platform_auto" ? labels.captionsAuto : labels.captionsCreator;
};

const bullet = (capture: VideoCapture, start: number, text: string) =>
  `- [${formatTimestamp(start)}](${timestampUrl(capture, start)}) ${plain(text)}`;

export const buildVideoNote = (input: {
  capture: VideoCapture;
  labels: VideoNoteLabels;
  capturedOn: string;
  cover: "placeholder" | "none";
}) => {
  const title = videoNoteTitle(input.capture.title, input.labels.fallbackTitle);
  const sourceLabel = linkLabel([input.capture.author, title].filter(Boolean).join(" - "));
  const caption = captionLabel(input.capture, input.labels);
  const meta = [
    `> **${plain(input.labels.source)}**：[${sourceLabel}](${input.capture.sourceUrl})`,
    `> **${plain(input.labels.platform)}**：${plain(platformLine(input.capture, input.labels))}`,
  ];
  const saved = `**${plain(input.labels.capturedAt)}**：${plain(input.capturedOn)}`;
  meta.push(caption
    ? `> **${plain(input.labels.captions)}**：${plain(caption)} · ${saved}`
    : `> ${saved}`);

  const lines = [`# ${plain(title).replace(/^#+\s*/, "")}`, "", ...meta, ""];
  if (input.cover === "placeholder") {
    lines.push(`![${linkLabel(input.labels.coverAlt)}](/api/v1/resources/${COVER_PLACEHOLDER}/blob)`, "");
  }

  const sections = input.capture.cues.length ? sectionsFromChapters(input.capture.chapters) : [];
  if (sections.length) {
    lines.push(`## ${plain(input.labels.outline)}`, "", ...sections.map((section) => bullet(input.capture, section.start, section.text)), "");
  }
  if (!input.capture.cues.length) {
    lines.push(plain(input.labels.noCaptions), "");
  } else {
    lines.push(
      "<details>",
      `<summary>${plain(input.labels.transcript)}</summary>`,
      "",
      ...input.capture.cues.map((cue) => bullet(input.capture, cue.start, cue.text)),
      "",
      "</details>",
      "",
    );
  }
  return { title, markdown: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n" };
};

export const videoNoteFromCapture = (input: {
  capture: VideoCapture;
  labels: VideoNoteLabels;
  capturedOn: string;
  cover: "placeholder" | "none";
}) => {
  const toast: VideoNoteToast = input.capture.cues.length ? "saved" : "info";
  return { ...buildVideoNote(input), toast };
};

const filenameForCover = (mimeType: string) => {
  if (mimeType === "image/png") return "cover.png";
  if (mimeType === "image/webp") return "cover.webp";
  if (mimeType === "image/gif") return "cover.gif";
  return "cover.jpg";
};

export const persistVideoNote = async (input: {
  notebookId: string;
  capture: VideoCapture;
  labels: VideoNoteLabels;
  capturedOn: string;
  createMemo: (body: {
    notebookId: string;
    title: string;
    contentMarkdown: string;
    tags: string[];
  }) => Promise<unknown>;
  createWithImage?: (body: {
    notebookId: string;
    title: string;
    contentMarkdown: string;
    tags: string[];
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  }) => Promise<unknown>;
}) => {
  const withCover = Boolean(input.capture.thumbnail && input.createWithImage);
  const noteFields = (title: string, contentMarkdown: string) => ({
    notebookId: input.notebookId,
    title,
    contentMarkdown,
    tags: ["web-clip"] as string[],
  });
  const note = videoNoteFromCapture({
    capture: input.capture,
    labels: input.labels,
    capturedOn: input.capturedOn,
    cover: withCover ? "placeholder" : "none",
  });
  if (withCover && input.capture.thumbnail && input.createWithImage) {
    try {
      await input.createWithImage({
        ...noteFields(note.title, note.markdown),
        filename: filenameForCover(input.capture.thumbnail.mimeType),
        mimeType: input.capture.thumbnail.mimeType,
        bytes: input.capture.thumbnail.bytes,
      });
      return note;
    } catch {
      // A missing write:resources scope or a bad image still leaves the note.
    }
  }
  const plainNote = note.markdown.includes(COVER_PLACEHOLDER)
    ? videoNoteFromCapture({
      capture: input.capture,
      labels: input.labels,
      capturedOn: input.capturedOn,
      cover: "none",
    })
    : note;
  await input.createMemo(noteFields(plainNote.title, plainNote.markdown));
  return plainNote;
};
