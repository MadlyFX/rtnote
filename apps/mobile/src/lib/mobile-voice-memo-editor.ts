import { VOICE_MEMO_NODE_TYPE, readVoiceMemoAttrs, type VoiceMemoAttrs } from "@rtnote/shared";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Parses voice memo attributes sent over the editor bridge. */
export const parseVoiceMemoAttrsJson = (value: string): VoiceMemoAttrs | null => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? readVoiceMemoAttrs(parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

/**
 * Fills in every pending voice memo block with `clientId` once its recording
 * uploaded. Title and transcript typed meanwhile are kept. Returns null when
 * no block matches (for example, the user deleted it).
 */
export const completePendingVoiceMemo = (
  state: EditorState,
  clientId: string,
  uploaded: Pick<VoiceMemoAttrs, "url" | "filename" | "mimeType" | "byteSize" | "durationMs">,
): Transaction | null => {
  if (!clientId || !uploaded.url) return null;
  const tr = state.tr;
  state.doc.descendants((node, pos) => {
    if (node.type.name !== VOICE_MEMO_NODE_TYPE) return true;
    if (node.attrs.clientId === clientId && !node.attrs.url) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        url: uploaded.url,
        filename: uploaded.filename || node.attrs.filename,
        mimeType: uploaded.mimeType || node.attrs.mimeType,
        byteSize: uploaded.byteSize ?? node.attrs.byteSize,
        durationMs: uploaded.durationMs ?? node.attrs.durationMs,
        clientId: "",
      });
    }
    return false;
  });
  return tr.docChanged ? tr : null;
};

/** The stored MIME type of the voice memo that plays `url`, for the audio cache. */
export const findVoiceMemoMimeType = (state: EditorState | null | undefined, url: string) => {
  let mimeType = "";
  state?.doc.descendants((node) => {
    if (mimeType) return false;
    if (node.type.name === VOICE_MEMO_NODE_TYPE) {
      if (node.attrs.url === url && typeof node.attrs.mimeType === "string") mimeType = node.attrs.mimeType;
      return false;
    }
    return true;
  });
  return mimeType;
};
