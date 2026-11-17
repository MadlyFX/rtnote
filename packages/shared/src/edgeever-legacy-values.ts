/**
 * Chinese values that EdgeEver stored in user data. RTNote writes English, but
 * notes, backups and older clients from EdgeEver still carry these, so readers
 * recognise them and map them to RTNote's values. Kept free of imports so
 * server entry points loaded by Node can use it.
 */

/** Text prefix EdgeEver put before attachment links in note text. */
export const LEGACY_ATTACHMENT_PREFIXES: readonly string[] = ["附件："];

/** Name EdgeEver gave the default inbox notebook. The inbox is found by id or slug, never by name. */
export const LEGACY_INBOX_NOTEBOOK_NAMES: readonly string[] = ["等待分类"];

/** Title of the welcome note that the installation migrations seed. */
export const LEGACY_WELCOME_MEMO_SEED_TITLE = "欢迎来到 EdgeEver";

/** RTNote's attachment prefix, written into new notes. */
export const ATTACHMENT_TEXT_PREFIX = "Attachment: ";

/**
 * Matches an RTNote or EdgeEver attachment prefix at the start of a link label,
 * including EdgeEver's variant with an ASCII colon.
 */
export const ATTACHMENT_LABEL_PREFIX_PATTERN = /^\s*(?:附件[：:]|Attachment:)\s*/i;

/** Strips an RTNote or EdgeEver attachment prefix from a label. */
export const stripAttachmentPrefix = (label: string) => {
  for (const prefix of [ATTACHMENT_TEXT_PREFIX.trim(), ...LEGACY_ATTACHMENT_PREFIXES]) {
    if (label.startsWith(prefix)) return label.slice(prefix.length).trimStart();
  }
  return label;
};
