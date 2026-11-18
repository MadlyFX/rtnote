import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_NOTEBOOK_SEEDS,
  WELCOME_MEMO_BASELINE_LOCALE,
  WELCOME_MEMO_ID,
  buildWelcomeMemoContent,
} from "../packages/shared/src/default-workspace-seeds";
import {
  DEFAULT_MEMO_TEMPLATE_SEEDS,
  defaultMemoTemplateId,
  localizeMemoTemplateSeed,
} from "../packages/shared/src/memo-template-seeds";

const BASELINE = "0100_baseline.sql";
const baseline = readFileSync(`migrations/${BASELINE}`, "utf8");
// Schema left by EdgeEver's 93 migrations, which the baseline replaces.
const legacySchema = readFileSync("tests/fixtures/edgeever-0094-schema.sql", "utf8");
// The same schema if 0094_branding.sql never ran: everything but its tables.
const partialLegacySchema = legacySchema
  .split(/;\n/)
  .filter((statement) => !/branding_(profiles|assets)/.test(statement))
  .join(";\n");

const databases: Database[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});
const open = () => {
  const db = new Database(":memory:");
  databases.push(db);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
};
// The self-hosted and desktop runners apply each migration in a transaction.
const migrate = (db: Database) => db.transaction(() => db.exec(baseline))();

const tokens = (sql: string) => sql.replace(/--[^\n]*/g, "").replace(/ IF NOT EXISTS/g, "").replace(/\s+/g, "");
const schema = (db: Database) => db
  .query("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
  .all()
  .map((row) => {
    const { type, name, sql } = row as { type: string; name: string; sql: string | null };
    return `${type} ${name} ${sql ? tokens(sql) : ""}`;
  });
const tableNames = (db: Database) => db
  .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => (row as { name: string }).name);
const dump = (db: Database) => Object.fromEntries(
  tableNames(db).map((name) => [name, db.query(`SELECT * FROM "${name}"`).all()]),
);

describe("baseline migration", () => {
  test("is the only migration up to 0100, so new migrations sort after it", () => {
    const files = readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort();
    expect(files[0]).toBe(BASELINE);
    expect(files.filter((name) => name < BASELINE)).toEqual([]);
  });

  test("creates exactly the schema the old migrations ended with", () => {
    const fresh = open();
    migrate(fresh);
    const legacy = open();
    legacy.exec(legacySchema);

    expect(schema(fresh)).toEqual(schema(legacy));
    expect(tableNames(fresh)).not.toContain("_rtnote_baseline");
    expect(fresh.query("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
    expect(fresh.query("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  test("has no AI writing-assist tables; only speech transcription remains", () => {
    const db = open();
    migrate(db);
    expect(tableNames(db).filter((name) => name.startsWith("ai_"))).toEqual([
      "ai_transcription_models",
      "ai_transcription_providers",
      "ai_transcription_workspace_settings",
    ]);
  });

  test("is written in English", () => {
    expect(baseline).not.toMatch(/[\u3400-\u9fff]/);
    const db = open();
    migrate(db);
    expect(JSON.stringify(dump(db))).not.toMatch(/[\u3400-\u9fff]/);
  });

  test("seeds the default workspace from the shared en-US seed definitions", () => {
    const db = open();
    migrate(db);
    const locale = WELCOME_MEMO_BASELINE_LOCALE;
    expect(locale).toBe("en-US");

    expect(db.query("SELECT id, name, is_personal FROM workspaces").all())
      .toEqual([{ id: "ws_default", name: "Personal workspace", is_personal: 1 }]);
    expect(db.query("SELECT id, provider, is_active FROM object_storage_configs").all())
      .toEqual([{ id: "builtin", provider: "builtin", is_active: 1 }]);
    expect(db.query("SELECT slug, name, color, sort_order FROM notebooks WHERE workspace_id = 'ws_default' ORDER BY sort_order").all())
      .toEqual(DEFAULT_NOTEBOOK_SEEDS.map((seed) => ({
        slug: seed.slug, name: seed.names[locale], color: seed.color, sort_order: seed.sortOrder,
      })));
    expect(db.query("SELECT id FROM notebooks WHERE slug = 'inbox'").get()).toEqual({ id: "nb_inbox" });

    const welcome = buildWelcomeMemoContent(locale);
    expect(db.query("SELECT notebook_id, title, excerpt, created_by, updated_by FROM memos WHERE id = ?").get(WELCOME_MEMO_ID))
      .toEqual({ notebook_id: "nb_inbox", title: welcome.title, excerpt: welcome.excerpt, created_by: "system", updated_by: "system" });
    // Seed localization recognises an untouched welcome note by this exact state.
    expect(db.query("SELECT content_json, content_markdown, content_text, content_hash, revision FROM memo_contents WHERE memo_id = ?").get(WELCOME_MEMO_ID))
      .toEqual({
        content_json: welcome.contentJson,
        content_markdown: welcome.contentMarkdown,
        content_text: welcome.contentText,
        content_hash: createHash("sha256").update(welcome.contentMarkdown + welcome.contentJson).digest("hex"),
        revision: 0,
      });
    expect(db.query("SELECT memo_id FROM memos_fts WHERE memos_fts MATCH 'welcome'").all())
      .toEqual([{ memo_id: WELCOME_MEMO_ID }]);

    expect(db.query("SELECT id, name, description, title, content_markdown, tags_json FROM memo_templates ORDER BY id").all())
      .toEqual(DEFAULT_MEMO_TEMPLATE_SEEDS.map((seed) => {
        const translation = localizeMemoTemplateSeed(seed, locale);
        return {
          id: defaultMemoTemplateId("ws_default", seed.key),
          name: translation.title,
          description: translation.description,
          title: translation.title,
          content_markdown: translation.contentMarkdown,
          tags_json: JSON.stringify(["template", seed.tag]),
        };
      }).sort((a, b) => a.id.localeCompare(b.id)));

    // First sign-in localizes these seeds and copies the example notes in.
    expect(db.query("SELECT workspace_id FROM workspace_seed_localizations").all()).toEqual([{ workspace_id: "ws_default" }]);
    expect(db.query("SELECT workspace_id FROM workspace_example_seeds").all()).toEqual([{ workspace_id: "ws_default" }]);
  });

  test("changes nothing on a database the old migrations already brought to 0094", () => {
    const db = open();
    db.exec(legacySchema);
    db.exec(`
      INSERT INTO workspaces (id, name) VALUES ('ws_default', 'Existing');
      INSERT INTO notebooks (id, workspace_id, name, slug) VALUES ('nb_kept', 'ws_default', 'Kept', 'inbox');
      INSERT INTO memos (id, workspace_id, notebook_id, title, tags_json) VALUES ('memo_kept', 'ws_default', 'nb_kept', 'Kept', '["a"]');
      INSERT INTO memo_contents (memo_id, content_json, content_hash) VALUES ('memo_kept', '{"type":"doc"}', 'hash');
    `);
    const before = { schema: schema(db), data: dump(db) };

    migrate(db);

    expect({ schema: schema(db), data: dump(db) }).toEqual(before);
  });

  test("a second run on a baseline database changes nothing", () => {
    const db = open();
    migrate(db);
    db.exec("DELETE FROM memos WHERE id = 'memo_welcome'");
    const before = dump(db);

    migrate(db);

    expect(dump(db)).toEqual(before);
  });

  test("refuses a database that stopped partway through the old migrations and leaves it untouched", () => {
    const db = open();
    db.exec(partialLegacySchema);
    db.exec("INSERT INTO workspaces (id, name) VALUES ('ws_default', 'Existing')");
    const before = { schema: schema(db), data: dump(db) };

    // The CHECK message, or the marker-table error on bun:sqlite 1.3 (see below).
    expect(() => migrate(db)).toThrow(
      /database stopped partway through the pre-baseline migrations|no such table: _rtnote_legacy_migrations_complete/,
    );
    expect({ schema: schema(db), data: dump(db) }).toEqual(before);
  });

  test("still refuses it on a runner that ignores the failed check", () => {
    // bun:sqlite 1.3 ignores a runtime error in any statement but the last.
    // Imitate it on any Bun: leave out the two statements that fail at run
    // time, the guard row and the marker table.
    const failingStatements = [
      /INSERT INTO _rtnote_baseline [^;]*;/,
      /CREATE TABLE _rtnote_legacy_migrations_complete AS[^;]*;/,
    ];
    const ignoringRunner = failingStatements.reduce((sql, statement) => {
      expect(sql).toMatch(statement);
      return sql.replace(statement, "");
    }, baseline);
    const db = open();
    db.exec(partialLegacySchema);
    const before = { schema: schema(db), data: dump(db) };

    expect(() => db.transaction(() => db.exec(ignoringRunner))()).toThrow("no such table: _rtnote_legacy_migrations_complete");
    expect({ schema: schema(db), data: dump(db) }).toEqual(before);
  });
});
