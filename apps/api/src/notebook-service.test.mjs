import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createSelfHostedStorageAdapter } from "./self-hosted-storage-adapter.ts";
import { deleteNotebookRecord, isInboxNotebook, updateNotebookRecord } from "./notebook-service.ts";
import { workspaceInboxId } from "./workspace-provisioning.ts";

const actor = { actorType: "user", actorId: "usr_1" };

const createFixture = () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE notebooks (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, parent_id TEXT, name TEXT NOT NULL,
      slug TEXT, icon TEXT, color TEXT, text_color TEXT, color_target TEXT NOT NULL DEFAULT 'icon', is_bold INTEGER NOT NULL DEFAULT 0, icon_inverted INTEGER NOT NULL DEFAULT 0, row_inverted INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE memos (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, notebook_id TEXT NOT NULL, title TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE audit_events (
      id TEXT PRIMARY KEY, actor_type TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    INSERT INTO notebooks (id, workspace_id, name, slug, is_deleted, created_at, updated_at) VALUES
      ('ws_1_inbox', 'ws_1', 'Inbox', 'inbox', 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
      ('nb_notes', 'ws_1', 'Notes', 'notes', 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z');
  `);
  return { sqlite, db: createSelfHostedStorageAdapter(sqlite, "/tmp/edgeever-notebook-service-test-unused").db };
};

describe("notebook identity", () => {
  test("recognizes legacy, workspace-scoped, and slug inbox identities", () => {
    expect(isInboxNotebook({ id: "nb_inbox", slug: "notes" }, "ws_1")).toBe(true);
    expect(isInboxNotebook({ id: workspaceInboxId("ws_1"), slug: "shou-ji-xiang" }, "ws_1")).toBe(true);
    expect(isInboxNotebook({ id: "nb_other", slug: "inbox" }, "ws_1")).toBe(true);
    expect(isInboxNotebook({ id: "nb_notes", slug: "notes" }, "ws_1")).toBe(false);
  });

  test("keeps the inbox slug when the default notebook is renamed", async () => {
    const fixture = createFixture();
    try {
      const notebook = await updateNotebookRecord(
        fixture.db,
        "ws_1",
        "ws_1_inbox",
        { name: "Collected" },
        actor,
      );
      expect(notebook).toMatchObject({ id: "ws_1_inbox", name: "Collected", slug: "inbox" });
    } finally {
      fixture.sqlite.close();
    }
  });

  test("rejects deleting a workspace inbox after it was renamed", async () => {
    const fixture = createFixture();
    try {
      await updateNotebookRecord(fixture.db, "ws_1", "ws_1_inbox", { name: "Collected" }, actor);
      await expect(deleteNotebookRecord(fixture.db, "ws_1", "ws_1_inbox", actor)).rejects.toMatchObject({
        code: "bad_request",
      });
      expect(
        fixture.sqlite.query("SELECT is_deleted, slug FROM notebooks WHERE id = 'ws_1_inbox'").get(),
      ).toEqual({ is_deleted: 0, slug: "inbox" });
    } finally {
      fixture.sqlite.close();
    }
  });

  test("deletes an empty notebook together with its empty descendants", async () => {
    const fixture = createFixture();
    try {
      fixture.sqlite.exec(`
        UPDATE notebooks SET name = 'Exam prep', slug = NULL WHERE id = 'nb_notes';
        INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, is_deleted, created_at, updated_at) VALUES
          ('nb_law', 'ws_1', 'nb_notes', 'Regulations', NULL, 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
          ('nb_history', 'ws_1', 'nb_notes', 'Architecture history', 'history', 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z'),
          ('nb_outline', 'ws_1', 'nb_history', 'Outline', 'outline', 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z');
        INSERT INTO memos (id, workspace_id, notebook_id, title, is_deleted, updated_at)
        VALUES ('memo_trashed', 'ws_1', 'nb_law', 'Deleted', 1, '2026-09-10T00:00:00.000Z');
      `);

      await deleteNotebookRecord(fixture.db, "ws_1", "nb_notes", actor);

      expect(
        fixture.sqlite.query("SELECT id FROM notebooks WHERE workspace_id = 'ws_1' AND is_deleted = 0 ORDER BY id").all(),
      ).toEqual([{ id: "ws_1_inbox" }]);
      await expect(deleteNotebookRecord(fixture.db, "ws_1", "nb_notes", actor)).resolves.toBeUndefined();
    } finally {
      fixture.sqlite.close();
    }
  });

  test("keeps the whole notebook tree when any descendant still has a note", async () => {
    const fixture = createFixture();
    try {
      fixture.sqlite.exec(`
        INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, is_deleted, created_at, updated_at) VALUES
          ('nb_child', 'ws_1', 'nb_notes', 'Child notebook', 'child', 0, '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z');
        INSERT INTO memos (id, workspace_id, notebook_id, title, is_deleted, updated_at)
        VALUES ('memo_keep', 'ws_1', 'nb_child', 'Still here', 0, '2026-09-10T00:00:00.000Z');
      `);

      await expect(deleteNotebookRecord(fixture.db, "ws_1", "nb_notes", actor)).rejects.toMatchObject({
        code: "notebook_not_empty",
        status: 409,
      });
      expect(
        fixture.sqlite.query("SELECT id FROM notebooks WHERE workspace_id = 'ws_1' AND is_deleted = 1").all(),
      ).toEqual([]);
    } finally {
      fixture.sqlite.close();
    }
  });
});

describe("notebook appearance", () => {
  test("persists appearance, preserves it during rename, and explicitly resets it", async () => {
    const { sqlite, db } = createFixture();
    try {
    const appearance = { icon: "network", color: "#2563eb", textColor: "#dc2626", isBold: true, iconInverted: true, rowInverted: true };
      expect(await updateNotebookRecord(db, "ws_1", "nb_notes", appearance, actor)).toMatchObject(appearance);
      expect(await updateNotebookRecord(db, "ws_1", "nb_notes", { name: "Heimnetz" }, actor)).toMatchObject({ ...appearance, name: "Heimnetz" });
    const reset = { icon: null, color: null, textColor: null, isBold: false, iconInverted: false, rowInverted: false };
      expect(await updateNotebookRecord(db, "ws_1", "nb_notes", reset, actor)).toMatchObject(reset);
      expect(sqlite.query("SELECT icon, color, color_target, is_bold FROM notebooks WHERE id = 'nb_notes'").get()).toEqual({ icon: null, color: null, color_target: "icon", is_bold: 0 });
      await expect(updateNotebookRecord(db, "other_workspace", "nb_notes", appearance, actor)).rejects.toThrow("Notebook not found");
    } finally { sqlite.close(); }
  });
});
