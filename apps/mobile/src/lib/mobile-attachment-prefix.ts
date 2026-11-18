// Free of native imports so the DOM editor bundle can use it too.
import { ATTACHMENT_TEXT_PREFIX, LEGACY_ATTACHMENT_PREFIXES } from "@edgeever/shared";

// RTNote's "Attachment:" prefix and the prefixes EdgeEver wrote, accepted with a half- or full-width colon.
const attachmentPrefixWords = [ATTACHMENT_TEXT_PREFIX, ...LEGACY_ATTACHMENT_PREFIXES]
  .map((prefix) => prefix.trim().replace(/[：:]$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const leadingAttachmentPrefix = new RegExp(`^\\s*(?:${attachmentPrefixWords})[：:]\\s*`, "i");
const attachmentPrefixOnly = new RegExp(`^(?:${attachmentPrefixWords})[：:]?$`, "i");

/** Removes a leading attachment prefix ("Attachment: " or a legacy EdgeEver one) from a link label. */
export const stripMobileAttachmentPrefix = (label: string) => label.replace(leadingAttachmentPrefix, "").trim();

/** True when text is only an attachment prefix, as left beside an attachment link. */
export const isMobileAttachmentPrefixText = (text: string) => attachmentPrefixOnly.test(text);
