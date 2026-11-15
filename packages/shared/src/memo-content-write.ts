import { docToMarkdown, emptyDoc, markdownToDoc } from "./content";
import { mergeMarkdownIntoDoc } from "./markdown-merge";
import {
  MEMO_SCHEMA_VERSION_LEGACY,
  MEMO_SCHEMA_VERSION_RICH_TEXT,
  isRichTextSchemaVersion,
  isStructuredNoteMarkdown,
} from "./memo-schema";
import type { TiptapDoc } from "./content";

export type MemoContentWriteInput = {
  contentJson?: unknown;
  contentMarkdown?: string;
};

export type MemoContentState = {
  contentJson: TiptapDoc;
  contentMarkdown: string;
  schemaVersion: number;
};

const isDoc = (value: unknown): value is TiptapDoc =>
  Boolean(value) && typeof value === "object" && Array.isArray((value as { content?: unknown }).content);

/**
 * Decides what a create (no `current`) or update stores in memo_contents.
 *
 * - Prose with JSON: the JSON is stored and Markdown is regenerated from it
 *   (schema 2). Any Markdown the client sent is ignored.
 * - Prose with Markdown only: the Markdown is merged into the current JSON
 *   block by block, so untouched blocks keep their formatting. Rich-text notes
 *   stay schema 2 with regenerated Markdown. New and legacy notes keep the
 *   Markdown as sent (schema 1), which Markdown importers compare against.
 * - Structured notes (table, diagram, poster, infographic markers) keep the
 *   legacy rules: their Markdown marker is the data.
 */
export const resolveMemoContentWrite = (
  input: MemoContentWriteInput,
  current?: MemoContentState | null,
): MemoContentState => {
  const json = isDoc(input.contentJson) ? input.contentJson : undefined;
  const markdown = typeof input.contentMarkdown === "string" ? input.contentMarkdown : undefined;

  if (json === undefined && markdown === undefined) {
    return current ?? {
      contentJson: emptyDoc(),
      contentMarkdown: "",
      schemaVersion: MEMO_SCHEMA_VERSION_RICH_TEXT,
    };
  }

  const structured = isStructuredNoteMarkdown(markdown)
    || (markdown === undefined && isStructuredNoteMarkdown(current?.contentMarkdown));
  if (structured) {
    const contentJson = json ?? (markdown !== undefined ? markdownToDoc(markdown) : current?.contentJson ?? emptyDoc());
    return {
      contentJson,
      contentMarkdown: markdown ?? docToMarkdown(contentJson),
      schemaVersion: MEMO_SCHEMA_VERSION_LEGACY,
    };
  }

  if (json !== undefined) {
    return {
      contentJson: json,
      contentMarkdown: docToMarkdown(json),
      schemaVersion: MEMO_SCHEMA_VERSION_RICH_TEXT,
    };
  }

  const markdownSource = markdown as string;
  if (!current) {
    return {
      contentJson: markdownToDoc(markdownSource),
      contentMarkdown: markdownSource,
      schemaVersion: MEMO_SCHEMA_VERSION_LEGACY,
    };
  }

  const contentJson = mergeMarkdownIntoDoc(current.contentJson, markdownSource);
  if (isRichTextSchemaVersion(current.schemaVersion)) {
    return {
      contentJson,
      contentMarkdown: docToMarkdown(contentJson),
      schemaVersion: MEMO_SCHEMA_VERSION_RICH_TEXT,
    };
  }
  return {
    contentJson,
    contentMarkdown: markdownSource,
    schemaVersion: MEMO_SCHEMA_VERSION_LEGACY,
  };
};
