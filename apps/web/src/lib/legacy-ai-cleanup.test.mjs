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
    "edgeever.aiSidebar.localThreads": "{\"turns\":[\"note text\"]}",
    "edgeever.aiSidebar.width": "380",
    "edgeever.aiAssistant.mode": "sidebar",
    "edgeever.ai-model-discovery.v1:provider": "[]",
    "edgeever.editor.aiSelectionMenuEnabled": "true",
    "edgeever.editor.aiSpaceShortcutEnabled": "false",
    "edgeever.desktop.session": "keep",
    "edgeever.editor.fontSize": "keep",
  });
  const session = memoryStorage({ "edgeever.aiSidebar.selectionTurns": "[]", "edgeever.other": "keep" });
  removeLegacyAiStorageKeys(local, session);
  expect([...local.map.keys()]).toEqual(["edgeever.desktop.session", "edgeever.editor.fontSize"]);
  expect([...session.map.keys()]).toEqual(["edgeever.other"]);
});

test("tolerates unavailable storage", () => {
  expect(() => removeLegacyAiStorageKeys(null, null)).not.toThrow();
});
