import { expect, test } from "bun:test";
import { removeLegacyAiStorageKeys } from "./legacy-ai-cleanup.ts";

const memoryStorage = (entries) => {
  const map = new Map(Object.entries(entries));
  return {
    map,
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
  };
};

test("removes leftover AI assistant data and keeps everything else", () => {
  const local = memoryStorage({
    "rtnote.aiSidebar.localThreads": "{\"turns\":[\"note text\"]}",
    "rtnote.aiSidebar.width": "380",
    "rtnote.aiAssistant.mode": "sidebar",
    "rtnote.ai-model-discovery.v1:provider": "[]",
    "rtnote.editor.aiSelectionMenuEnabled": "true",
    "rtnote.editor.aiSpaceShortcutEnabled": "false",
    "rtnote.desktop.session": "keep",
    "rtnote.editor.fontSize": "keep",
  });
  const session = memoryStorage({ "rtnote.aiSidebar.selectionTurns": "[]", "rtnote.other": "keep" });
  removeLegacyAiStorageKeys(local, session);
  expect([...local.map.keys()]).toEqual(["rtnote.desktop.session", "rtnote.editor.fontSize"]);
  expect([...session.map.keys()]).toEqual(["rtnote.other"]);
});

test("tolerates unavailable storage", () => {
  expect(() => removeLegacyAiStorageKeys(null, null)).not.toThrow();
});
