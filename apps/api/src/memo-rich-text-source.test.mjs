import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { globSync, readFileSync } from "node:fs";
import { docToMarkdown } from "@edgeever/shared";
import { createMemoRecord, updateMemoRecord } from "./memo-service.ts";
import { createSelfHostedStorageAdapter } from "./self-hosted-storage-adapter.ts";

const opened = [];
afterEach(() => opened.splice(0).forEach((db) => db.close()));

const setup = () => {
  const sqlite = new Database(":memory:");
  opened.push(sqlite);
  for (const file of globSync("migrations/*.sql").sort()) sqlite.exec(readFileSync(file, "utf8"));
  sqlite.exec(`INSERT INTO workspaces(id, name) VALUES ('ws', 'Workspace');
    INSERT INTO notebooks(id, workspace_id, name) VALUES ('inbox', 'ws', 'Inbox');`);
  return { sqlite, db: createSelfHostedStorageAdapter(sqlite, "/tmp/memo-rich-text-unused").db };
};

const actor = { actorType: "user", actorId: "user" };
const colored = {
  type: "paragraph",
  content: [{ type: "text", text: "Red words", marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }] }],
};
const doc = {
  type: "doc",
  content: [colored, { type: "paragraph", content: [{ type: "text", text: "Second paragraph" }] }],
};

test("JSON saves are rich text with Markdown generated on the server", async () => {
  const { sqlite, db } = setup();
  const memo = await createMemoRecord(db, "ws", {
    notebookId: "inbox",
    contentJson: doc,
    contentMarkdown: "a stale client copy",
  }, actor, "user");
  expect(memo.schemaVersion).toBe(2);
  expect(memo.contentJson).toEqual(doc);
  expect(memo.contentMarkdown).toBe(docToMarkdown(doc));
  expect(sqlite.query("SELECT schema_version FROM memo_contents WHERE memo_id = ?").get(memo.id).schema_version).toBe(2);
});

test("a Markdown-only edit to a rich-text note keeps formatting on untouched blocks", async () => {
  const { db } = setup();
  const created = await createMemoRecord(db, "ws", { notebookId: "inbox", contentJson: doc }, actor, "user");
  const result = await updateMemoRecord(db, "ws", created.id, {
    contentMarkdown: created.contentMarkdown.replace("Second paragraph", "Agent rewrite"),
  }, actor, "agent");
  expect(result.error).toBeUndefined();
  expect(result.memo.schemaVersion).toBe(2);
  expect(result.memo.contentJson.content[0]).toEqual(colored);
  expect(result.memo.contentMarkdown).toContain("Agent rewrite");
  expect(result.memo.contentMarkdown).toBe(docToMarkdown(result.memo.contentJson));
});

test("Markdown-only creates keep the Markdown that importers compare against", async () => {
  const { db } = setup();
  const markdown = "# Imported\n\nBody   with spacing";
  const memo = await createMemoRecord(db, "ws", { notebookId: "inbox", contentMarkdown: markdown }, actor, "user");
  expect(memo.schemaVersion).toBe(1);
  expect(memo.contentMarkdown).toBe(markdown);
});

test("a rich-text edit upgrades a legacy note to schema 2", async () => {
  const { db } = setup();
  const created = await createMemoRecord(db, "ws", { notebookId: "inbox", contentMarkdown: "Old body" }, actor, "user");
  const result = await updateMemoRecord(db, "ws", created.id, { contentJson: doc }, actor, "user");
  expect(result.memo.schemaVersion).toBe(2);
  expect(result.memo.contentMarkdown).toBe(docToMarkdown(doc));
});
