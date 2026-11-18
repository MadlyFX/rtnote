/** Kept free of imports so server entry points loaded by Node can use it. */

export const DEFAULT_MEMO_TITLE = "Untitled note";

/**
 * Default titles that EdgeEver stored for untitled notes. Notes created there,
 * restored from its backups or synced from an older client still carry them,
 * so they count as untitled too. Translation data, not UI text.
 */
export const LEGACY_DEFAULT_MEMO_TITLES: readonly string[] = ["无标题笔记"];

/** True when a stored title is empty or one of the default untitled titles. */
export const isDefaultMemoTitle = (title: string | null | undefined) => {
  const trimmed = title?.trim() ?? "";
  return !trimmed || trimmed === DEFAULT_MEMO_TITLE || LEGACY_DEFAULT_MEMO_TITLES.includes(trimmed);
};

/** Maps EdgeEver's stored default title to RTNote's; any other title is returned unchanged. */
export const normalizeLegacyMemoTitle = (title: string) =>
  LEGACY_DEFAULT_MEMO_TITLES.includes(title.trim()) ? DEFAULT_MEMO_TITLE : title;

/**
 * Title to show for a note. Untitled notes are stored with the default title,
 * so it is replaced by the reader's localized label like an empty one.
 */
export const getMemoDisplayTitle = (title: string | null | undefined, untitledLabel: string) =>
  isDefaultMemoTitle(title) ? untitledLabel : (title ?? "").trim();
