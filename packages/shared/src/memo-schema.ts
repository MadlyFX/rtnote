import { hasDiagramDocumentMarker } from "./diagram";
import { hasInfographicDocumentMarker } from "./infographic";
import { hasPosterDocumentMarker } from "./poster";
import { hasTableDocumentMarker } from "./table";

/**
 * memo_contents.schema_version values.
 *
 * 1 — legacy: content_markdown may be the authoritative copy (Markdown-only
 *     writes, structured notes, and notes inherited from RTNote).
 * 2 — rich text: content_json is the only source and content_markdown is
 *     regenerated from it on every write.
 */
export const MEMO_SCHEMA_VERSION_LEGACY = 1;
export const MEMO_SCHEMA_VERSION_RICH_TEXT = 2;

/**
 * Tables, diagrams, posters and infographics keep their data in a marker
 * comment inside content_markdown, with content_json only a rendered fallback.
 * They stay on the legacy rules.
 */
export const isStructuredNoteMarkdown = (markdown: string | null | undefined) =>
  hasTableDocumentMarker(markdown)
  || hasDiagramDocumentMarker(markdown)
  || hasPosterDocumentMarker(markdown)
  || hasInfographicDocumentMarker(markdown);

export const isRichTextSchemaVersion = (schemaVersion: number | null | undefined) =>
  typeof schemaVersion === "number" && schemaVersion >= MEMO_SCHEMA_VERSION_RICH_TEXT;
