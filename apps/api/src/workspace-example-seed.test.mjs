import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { globSync, readFileSync } from "node:fs";
import { createSelfHostedStorageAdapter } from "./self-hosted-storage-adapter.ts";
import { ensureUserWorkspace } from "./workspace-provisioning.ts";
import {
  ensureWorkspaceExampleSeed,
  omitInstanceUnavailableExampleTips,
} from "./workspace-example-seed.ts";
import { DEMO_SEED_MEMOS } from "./demo-seed-data.ts";
import { DEMO_RESET_TIP_MARKER_ZH } from "./demo-seed-data.zh-CN.ts";

const migrationFiles = globSync("migrations/*.sql").sort();
const opened = [];
afterEach(() => opened.splice(0).forEach((sqlite) => sqlite.close()));

const migrate = (sqlite) => {
  for (const file of migrationFiles) sqlite.exec(readFileSync(file, "utf8"));
};

const openDatabase = () => {
  const sqlite = new Database(":memory:");
  opened.push(sqlite);
  const puts = [];
  const { db } = createSelfHostedStorageAdapter(sqlite, "/tmp/edgeever-example-seed-unused");
  const env = {
    storage: {
      db,
      resources: {
        put: async (key) => {
          puts.push(key);
        },
      },
    },
  };
  return { sqlite, env, puts };
};

const freshInstallation = () => {
  const database = openDatabase();
  migrate(database.sqlite);
  return database;
};

const addUser = (sqlite, id, username = id) => sqlite
  .query("INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, 'unused', ?)")
  .run(id, username, username);

const pending = (sqlite) => sqlite
  .query("SELECT workspace_id FROM workspace_example_seeds ORDER BY workspace_id")
  .all()
  .map((row) => row.workspace_id);

const exampleCounts = (sqlite, workspaceId = "ws_default") => Object.fromEntries(
  sqlite.query(
    `SELECT n.slug, COUNT(m.id) AS count
     FROM notebooks n
     LEFT JOIN memos m ON m.notebook_id = n.id AND m.is_deleted = 0
     WHERE n.workspace_id = ? AND n.slug IN ('demo-features', 'feature-demos')
     GROUP BY n.slug
     ORDER BY n.slug`,
  ).all(workspaceId).map((row) => [row.slug, row.count]),
);

const overviewMarkdown = (sqlite, memoId = "memo_demo_overview") => sqlite
  .query("SELECT content_markdown FROM memo_contents WHERE memo_id = ?")
  .get(memoId)?.content_markdown ?? "";

describe("workspace example seed", () => {
  test("drops the demo-only reset tip from copied notes", () => {
    const source = [
      "> 7. Click **\"Share as Card\"** to export a social poster card.",
      `> 8. Click **"${DEMO_RESET_TIP_MARKER_ZH}"** to reset the demo workspace.`,
      "> 8. Click **\"Reset Demo Data\"** in settings or the sidebar anytime to restore the demo workspace.",
    ].join("\n");

    expect(omitInstanceUnavailableExampleTips(source)).toBe(
      "> 7. Click **\"Share as Card\"** to export a social poster card.",
    );
  });

  test("gives a fresh installation both example notebooks and leaves the welcome note", async () => {
    const { sqlite, env, puts } = freshInstallation();
    expect(pending(sqlite)).toEqual(["ws_default"]);

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual([]);
    expect(exampleCounts(sqlite)).toEqual({ "demo-features": 7, "feature-demos": 7 });
    expect(sqlite.query("SELECT id FROM memos WHERE id = 'memo_welcome'").get()).toEqual({ id: "memo_welcome" });
    expect(sqlite.query("SELECT parent_id FROM notebooks WHERE id = 'nb_demo_features'").get())
      .toEqual({ parent_id: "nb_projects" });
    expect(overviewMarkdown(sqlite)).toContain("/api/v1/resources/res_demo_logo/blob");
    expect(overviewMarkdown(sqlite)).not.toContain(DEMO_RESET_TIP_MARKER_ZH);
    expect(overviewMarkdown(sqlite, "memo_demo_overview_en")).not.toContain("Reset Demo Data");
    expect(sqlite.query("SELECT COUNT(*) AS count FROM resources WHERE id = 'res_demo_logo'").get()).toEqual({ count: 1 });
    expect(puts.some((key) => key.includes("res_demo_logo"))).toBe(true);

    const memoCount = sqlite.query("SELECT COUNT(*) AS count FROM memos").get().count;
    await ensureWorkspaceExampleSeed(env, "ws_default");
    expect(sqlite.query("SELECT COUNT(*) AS count FROM memos").get().count).toBe(memoCount);
  });

  test("still seeds a welcome note that was only localized", async () => {
    const { sqlite, env } = freshInstallation();
    addUser(sqlite, "usr_owner", "admin");
    await ensureUserWorkspace(env.storage.db, "usr_owner", "admin", "pl");

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(sqlite.query("SELECT title FROM memos WHERE id = 'memo_welcome'").get()).toEqual({ title: "Witaj w RTNote" });
    expect(exampleCounts(sqlite)).toEqual({ "demo-features": 7, "feature-demos": 7 });
  });

  test("drops a pending seed when the workspace already has another note", async () => {
    const { sqlite, env } = freshInstallation();
    sqlite.query(
      `INSERT INTO memos (id, notebook_id, title, created_by, updated_by)
       VALUES ('memo_user', 'nb_inbox', 'My own note', 'usr_owner', 'usr_owner')`,
    ).run();

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual([]);
    expect(exampleCounts(sqlite)).toEqual({});
  });

  test("drops a pending seed when the user has edited the welcome note", async () => {
    const { sqlite, env } = freshInstallation();
    sqlite.query("UPDATE memos SET updated_by = 'usr_owner' WHERE id = 'memo_welcome'").run();

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual([]);
    expect(exampleCounts(sqlite)).toEqual({});
  });

  test("drops a pending seed when the welcome body no longer matches a system translation", async () => {
    const { sqlite, env } = freshInstallation();
    sqlite.query("UPDATE memo_contents SET content_hash = 'edited' WHERE memo_id = 'memo_welcome'").run();

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual([]);
    expect(exampleCounts(sqlite)).toEqual({});
  });

  test("gives a newly created workspace its own copy with distinct ids", async () => {
    const { sqlite, env } = freshInstallation();
    addUser(sqlite, "usr_owner", "admin");
    addUser(sqlite, "usr_writer", "writer");
    await ensureUserWorkspace(env.storage.db, "usr_owner", "admin", "zh-CN");
    const workspace = await ensureUserWorkspace(env.storage.db, "usr_writer", "writer", "ja");
    expect(pending(sqlite)).toContain(workspace.workspaceId);

    await ensureWorkspaceExampleSeed(env, workspace.workspaceId);

    expect(pending(sqlite)).not.toContain(workspace.workspaceId);
    expect(exampleCounts(sqlite, workspace.workspaceId)).toEqual({ "demo-features": 7, "feature-demos": 7 });
    const notebook = sqlite.query(
      "SELECT id, parent_id FROM notebooks WHERE workspace_id = ? AND slug = 'demo-features'",
    ).get(workspace.workspaceId);
    expect(notebook.id).toBe(`${workspace.workspaceId}_nb_demo_features`);
    expect(notebook.parent_id).toBe(`${workspace.workspaceId}_projects`);
    const markdown = sqlite.query(
      `SELECT c.content_markdown
       FROM memo_contents c
       INNER JOIN memos m ON m.id = c.memo_id
       WHERE m.workspace_id = ? AND m.title = ?`,
    ).get(workspace.workspaceId, DEMO_SEED_MEMOS.find((memo) => memo.id === "memo_demo_overview").title).content_markdown;
    expect(markdown).toContain(`/api/v1/resources/${workspace.workspaceId}_res_demo_logo/blob`);
    expect(markdown).not.toContain("/api/v1/resources/res_demo_logo/blob");
    expect(sqlite.query("SELECT id FROM memos WHERE id = 'memo_demo_overview'").get()).toBeNull();
  });

  test("waits to seed until object storage can store the example files", async () => {
    const { sqlite, env } = freshInstallation();
    env.storage.resources = {};

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual(["ws_default"]);
    expect(exampleCounts(sqlite)).toEqual({});
  });

  test("leaves the catalog to demo mode", async () => {
    const { sqlite, env } = freshInstallation();
    env.EDGE_EVER_DEMO_MODE = "true";

    await ensureWorkspaceExampleSeed(env, "ws_default");

    expect(pending(sqlite)).toEqual([]);
    expect(exampleCounts(sqlite)).toEqual({});
    expect(sqlite.query("SELECT COUNT(*) AS count FROM memos").get()).toEqual({ count: 1 });
  });
});
