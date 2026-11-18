import type { AnyExtension } from "@tiptap/core";
import { EdgeEverImage as Image, ImageAlignmentAttributes } from "./image-alignment";
import { ImageLinkAttributes } from "./image-link";
import { createImageFigureExtensions, type ImageCaptionOptions } from "./image-figure";
import { TaskList } from "@tiptap/extension-list";
import { EdgeEverTableKit as TableKit } from "./markdown-table";
import { HtmlTableMarkdown } from "./rich-table-markdown";
import { Markdown } from "@tiptap/markdown";
import { RTNoteStarterKit as StarterKit, AlignedBlockMarkdown } from "./block-formatting-markdown";
import { BlockFormatting } from "./text-formatting";
import { createEdgeEverDetailsExtensions } from "./details";
import { FileAttachment } from "./file-attachment";
import { ImageGallery } from "./image-gallery";
import { MergeDivider } from "./merge-divider";
import { PdfAttachment } from "./pdf-attachment";
import { PluginEmbed } from "./plugin-embed";
import { VoiceMemo } from "./voice-memo";
import { EmptyExternalLink } from "./empty-external-link";
import { EdgeEverLink } from "./editor-link";
import { createEdgeEverTaskItem } from "./task-item-input";
import { MathCodeFence } from "./mathematics-markdown";
import { createTextColorExtensions } from "./text-colors";
import { createEdgeEverMarked } from "./markdown-options";

export type CreateEdgeEverDocumentExtensionsOptions = {
  mathematics: AnyExtension[];
  starterKit?: Parameters<typeof StarterKit.configure>[0];
  image?: AnyExtension | false;
  gallery?: AnyExtension | false;
  pdf?: AnyExtension | false;
  file?: AnyExtension | false;
  /** Voice memo block; editors pass their own node view. */
  voiceMemo?: AnyExtension | false;
  pluginEmbed?: AnyExtension | false;
  table?: Parameters<typeof TableKit.configure>[0];
  /**
   * Caption options; pass a localized placeholder in editors. Captions are on
   * even with `image: false`, because editors that pass false register their
   * own image node.
   */
  imageCaption?: Partial<ImageCaptionOptions> | false;
  markdown?: boolean;
};

const withOptional = (value: AnyExtension | false | undefined, fallback: AnyExtension) => {
  if (value === false) return [];
  return [value ?? fallback];
};

/**
 * Document-schema TipTap extensions shared by Markdown codecs and editors.
 * Pass KaTeX math from `@edgeever/shared/mathematics` in browsers; Worker
 * codecs must keep using `createEdgeEverMarkdownMathematics()`.
 */
export const createEdgeEverDocumentExtensions = (
  options: CreateEdgeEverDocumentExtensionsOptions,
): AnyExtension[] => [
  options.markdown
    ? StarterKit.configure({ ...options.starterKit, link: false })
    : options.starterKit === undefined ? StarterKit : StarterKit.configure(options.starterKit),
  ...(options.markdown ? [EdgeEverLink] : []),
  EmptyExternalLink,
  ...createTextColorExtensions(),
  BlockFormatting,
  AlignedBlockMarkdown,
  TaskList,
  createEdgeEverTaskItem(),
  options.table === undefined ? TableKit : TableKit.configure(options.table),
  HtmlTableMarkdown,
  ...withOptional(options.image, Image),
  ...(options.imageCaption === false ? [] : createImageFigureExtensions(options.imageCaption)),
  ImageAlignmentAttributes,
  ImageLinkAttributes,
  ...withOptional(options.gallery, ImageGallery),
  ...withOptional(options.pdf, PdfAttachment),
  ...withOptional(options.file, FileAttachment),
  ...withOptional(options.voiceMemo, VoiceMemo),
  MergeDivider,
  ...createEdgeEverDetailsExtensions(),
  ...withOptional(options.pluginEmbed, PluginEmbed),
  ...options.mathematics,
  MathCodeFence,
  ...(options.markdown
    ? [Markdown.configure({ marked: createEdgeEverMarked(), markedOptions: { gfm: true } })]
    : []),
];
