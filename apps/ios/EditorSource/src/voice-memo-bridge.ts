import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { VOICE_MEMO_NODE_TYPE, readVoiceMemoAttrs, type VoiceMemoAttrs } from "@edgeever/shared";

/**
 * Voice memo calls from the Swift host. Swift records and uploads; the editor
 * only inserts the block and fills in its recording once it is saved.
 *
 * A recording that has not uploaded yet is a block with an empty `url` and a
 * `clientId`; Swift keeps the file on the device under that id until the
 * upload succeeds, then calls `completeIosVoiceMemo`.
 */

/** Server and remote URLs need native loading (auth, offline cache, custom scheme). */
export const needsNativeAudioLoad = (url: string) =>
  Boolean(url) && !url.startsWith("edgeever-res:") && !url.startsWith("data:") && !url.startsWith("blob:");

const parseAttrs = (json: string): Partial<VoiceMemoAttrs> | null => {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return readVoiceMemoAttrs(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
};

/**
 * Inserts a voice memo block after the selection and leaves the caret in a
 * paragraph below it. It never replaces the selection: a selected block (for
 * example another voice memo) or selected text stays where it is.
 */
export const insertIosVoiceMemo = (editor: Editor, attrsJson: string): boolean => {
  if (!editor.isEditable || editor.isDestroyed) return false;
  const type = editor.schema.nodes[VOICE_MEMO_NODE_TYPE];
  const paragraph = editor.schema.nodes.paragraph;
  if (!type || !paragraph) return false;
  const attrs = parseAttrs(attrsJson);
  if (!attrs || (!attrs.url && !attrs.clientId)) return false;
  const { state } = editor;
  const memo = type.create(attrs);
  const tr = state.tr;
  // Insert at the end of the selection, split out of any text block.
  const $end = state.doc.resolve(state.selection.to);
  let insertPos = state.selection.to;
  if ($end.parent.isTextblock) {
    insertPos = $end.parentOffset === 0 && $end.parent.content.size > 0 ? $end.before() : $end.after();
    if ($end.parentOffset > 0 && $end.parentOffset < $end.parent.content.size) {
      tr.split(state.selection.to);
      // Between the two halves: the end of the first half, past its closing token.
      insertPos = tr.mapping.map(state.selection.to, -1) + 1;
    }
    // An empty paragraph is replaced by the memo instead of leaving a gap above it.
    if ($end.parent.content.size === 0 && $end.depth === 1) {
      tr.replaceWith($end.before(), $end.after(), memo);
      insertPos = -1;
    }
  }
  try {
    if (insertPos >= 0) tr.insert(insertPos, memo);
  } catch {
    return false;
  }
  // Find the inserted block and make sure a paragraph follows it for the caret.
  let memoEnd = -1;
  tr.doc.descendants((node, pos) => {
    if (memoEnd === -1 && node === memo) memoEnd = pos + node.nodeSize;
    return memoEnd === -1;
  });
  if (memoEnd === -1) return false;
  const after = tr.doc.resolve(memoEnd).nodeAfter;
  if (!after || !after.isTextblock) tr.insert(memoEnd, paragraph.create());
  tr.setSelection(TextSelection.create(tr.doc, memoEnd + 1)).scrollIntoView();
  editor.view.dispatch(tr);
  try {
    editor.view.focus();
  } catch {
    // No focusable view (headless); the insert still happened.
  }
  return true;
};

/** Positions of voice memo blocks, optionally only the one with `clientId`. */
const findVoiceMemos = (editor: Editor, clientId?: string) => {
  const found: Array<{ pos: number; attrs: VoiceMemoAttrs }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== VOICE_MEMO_NODE_TYPE) return true;
    const attrs = readVoiceMemoAttrs(node.attrs);
    if (clientId === undefined || attrs.clientId === clientId) found.push({ pos, attrs });
    return false;
  });
  return found;
};

/**
 * Sets the uploaded recording on the pending block with `clientId` and clears
 * the id. Title and transcript typed meanwhile are kept.
 */
export const completeIosVoiceMemo = (editor: Editor, clientId: string, attrsJson: string): boolean => {
  if (!clientId || editor.isDestroyed) return false;
  const attrs = parseAttrs(attrsJson);
  if (!attrs?.url) return false;
  const targets = findVoiceMemos(editor, clientId);
  if (!targets.length) return false;
  const tr = editor.state.tr;
  for (const { pos, attrs: current } of targets) {
    tr.setNodeMarkup(pos, undefined, {
      ...current,
      url: attrs.url,
      filename: attrs.filename || current.filename,
      mimeType: attrs.mimeType || current.mimeType,
      byteSize: attrs.byteSize ?? current.byteSize,
      durationMs: attrs.durationMs ?? current.durationMs,
      clientId: "",
    });
  }
  // Uploading is not an edit the user should undo.
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
  return true;
};

/** Client ids of voice memos whose recording has not been uploaded yet. */
export const listIosPendingVoiceMemos = (editor: Editor): string[] =>
  findVoiceMemos(editor)
    .filter(({ attrs }) => !attrs.url && attrs.clientId)
    .map(({ attrs }) => attrs.clientId);
