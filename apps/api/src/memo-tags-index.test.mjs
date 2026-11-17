import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { globSync, readFileSync } from "node:fs";

describe("normalized memo tags", () => {
  test("keep the indexed relation synchronized with memos.tags_json", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const path of globSync("migrations/*.sql").sort()) {
      sqlite.exec(readFileSync(path, "utf8"));
    }

    sqlite.query(
      `UPDATE memos SET tags_json = '["Demo","Database"]' WHERE id = 'memo_welcome'`,
    ).run();

    expect(sqlite.query(
      `SELECT name, normalized_name FROM memo_tags WHERE memo_id = 'memo_welcome' ORDER BY name`,
    ).all()).toEqual([
      { name: "Database", normalized_name: "database" },
      { name: "Demo", normalized_name: "demo" },
    ]);

    sqlite.query(`UPDATE memos SET tags_json = '["Updated"]' WHERE id = 'memo_welcome'`).run();
    expect(sqlite.query(
      `SELECT name, normalized_name FROM memo_tags WHERE memo_id = 'memo_welcome'`,
    ).all()).toEqual([{ name: "Updated", normalized_name: "updated" }]);

    expect(sqlite.query(
      `EXPLAIN QUERY PLAN SELECT memo_id FROM memo_tags WHERE workspace_id = ? AND normalized_name = ?`,
    ).all().some((row) => String(row.detail).includes("idx_memo_tags_workspace_name"))).toBe(true);

    sqlite.query(`UPDATE memos SET tags_json = '[]' WHERE id = 'memo_welcome'`).run();
    expect(sqlite.query(
      `SELECT COUNT(*) AS count FROM memo_tags WHERE memo_id = 'memo_welcome'`,
    ).get().count).toBe(0);
    sqlite.close();
  });
});
