import Dexie from "dexie";

/**
 * AI writing assist was removed. Earlier versions kept unapplied AI drafts,
 * assistant conversations and generated images on this device, some of them
 * holding note text. Remove that leftover data; nothing reads it any more.
 */
const LEGACY_DATABASES = ["rtnote-ai-drafts", "rtnote-local-agent-images-v1"];
const LEGACY_LOCAL_PREFIXES = ["rtnote.aiSidebar.", "rtnote.aiAssistant.", "rtnote.ai-model-discovery."];
const LEGACY_LOCAL_KEYS = ["rtnote.editor.aiSelectionMenuEnabled", "rtnote.editor.aiSpaceShortcutEnabled"];
const LEGACY_SESSION_KEYS = ["rtnote.aiSidebar.selectionTurns"];

type KeyStorage = Pick<Storage, "key" | "length" | "removeItem">;

export const removeLegacyAiStorageKeys = (local: KeyStorage | null, session: KeyStorage | null) => {
  if (local) {
    const keys: string[] = [];
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key && (LEGACY_LOCAL_KEYS.includes(key) || LEGACY_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix)))) keys.push(key);
    }
    for (const key of keys) local.removeItem(key);
  }
  for (const key of LEGACY_SESSION_KEYS) session?.removeItem(key);
};

const storageOrNull = (read: () => Storage) => {
  try {
    return read();
  } catch {
    return null;
  }
};

let started: Promise<void> | null = null;

/** Safe to call repeatedly; storage that is unavailable (private mode) is skipped. */
export const removeLegacyAiData = () => {
  started ??= (async () => {
    if (typeof window === "undefined") return;
    try {
      removeLegacyAiStorageKeys(
        storageOrNull(() => window.localStorage),
        storageOrNull(() => window.sessionStorage),
      );
    } catch {
      // Blocked storage: nothing to remove.
    }
    if (typeof indexedDB === "undefined") return;
    await Promise.all(LEGACY_DATABASES.map((name) => Dexie.delete(name).catch(() => undefined)));
  })();
  return started;
};
