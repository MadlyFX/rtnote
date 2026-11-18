import { globSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

const AI_TABLES = [
  "ai_model_configs",
  "ai_models",
  "ai_prompt_templates",
  "ai_provider_configs",
  "ai_workspace_settings",
  "companion_action_checks",
  "companion_actions",
  "companion_discoveries",
  "companion_discovery_settings",
  "companion_memories",
  "companion_memory_evidence",
  "companion_memory_exclusions",
  "companion_state",
  "companion_turn_attachment_parts",
  "companion_turn_attachments",
  "companion_turns",
];

const tables = (db: Database) =>
  db.query("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => (row as { name: string }).name);

test("dropping AI writing assist keeps notes, speech settings and backup counters", () => {
  const db = new Database(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON");
    const migrations = globSync("migrations/*.sql").sort();
    const removalIndex = migrations.findIndex((path) => path.endsWith("0093_drop_ai_writing_assist.sql"));
    expect(removalIndex).toBeGreaterThan(0);
    for (const migration of migrations.slice(0, removalIndex)) db.exec(readFileSync(migration, "utf8"));

    // Data a real instance holds before the upgrade.
    db.exec(`
      INSERT INTO ai_provider_configs (id, workspace_id, provider, display_name, base_url, api_key_encrypted, is_enabled)
        VALUES ('aip_1', 'ws_default', 'openai-compatible', 'Model', 'https://models.example/v1', 'encrypted', 1);
      INSERT INTO ai_models (id, provider_config_id, model_id, display_name) VALUES ('aim_1', 'aip_1', 'model-a', 'Model A');
      INSERT INTO ai_workspace_settings (workspace_id, default_model_id) VALUES ('ws_default', 'aim_1')
        ON CONFLICT(workspace_id) DO UPDATE SET default_model_id = excluded.default_model_id;
      INSERT INTO ai_transcription_providers (id, workspace_id, provider, display_name, base_url, api_key_encrypted, is_enabled)
        VALUES ('atp_1', 'ws_default', 'openai-compatible', 'Speech', 'https://speech.example/v1', 'encrypted-speech', 1);
      INSERT INTO ai_transcription_models (id, provider_id, model_id, display_name) VALUES ('atm_1', 'atp_1', 'whisper-1', 'Whisper');
      INSERT INTO ai_transcription_workspace_settings (workspace_id, default_model_id) VALUES ('ws_default', 'atm_1');
    `);
    const promptCount = (db.query("SELECT COUNT(*) AS count FROM ai_prompt_templates").get() as { count: number }).count;
    expect(promptCount).toBeGreaterThan(0);
    const memoCount = db.query("SELECT COUNT(*) AS count FROM memos").get();

    db.exec(readFileSync(migrations[removalIndex], "utf8"));

    const remaining = tables(db);
    for (const table of AI_TABLES) expect(remaining).not.toContain(table);
    for (const table of ["workspaces", "memos", "ai_transcription_providers", "ai_transcription_models", "ai_transcription_workspace_settings"]) {
      expect(remaining).toContain(table);
    }
    expect(db.query("SELECT COUNT(*) AS count FROM memos").get()).toEqual(memoCount);
    expect(db.query("SELECT default_model_id FROM ai_transcription_workspace_settings WHERE workspace_id = 'ws_default'").get())
      .toEqual({ default_model_id: "atm_1" });
    expect(db.query("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%ai_prompt%'").all()).toEqual([]);
    expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);

    // The backup revision still moves for kept content.
    const revision = () => (db.query("SELECT backup_revision FROM workspaces WHERE id = 'ws_default'").get() as { backup_revision: number }).backup_revision;
    const before = revision();
    db.exec("UPDATE notebooks SET name = 'Renamed' WHERE workspace_id = 'ws_default'");
    expect(revision()).toBeGreaterThan(before);

    // Running it again (a retried deploy) is harmless.
    db.exec(readFileSync(migrations[removalIndex], "utf8"));
  } finally {
    db.close();
  }
});
