-- RTNote database baseline.
--
-- This file replaces the 93 migrations RTNote inherited from EdgeEver
-- (0001_initial.sql to 0094_branding.sql). It creates the schema those
-- migrations ended with, minus the tables later migrations dropped, and seeds
-- the default workspace in English. Numbering continues from 0100 so new
-- migrations sort after it on every database, old or new.
--
-- It runs safely on three kinds of database:
--
-- * Empty: creates everything and seeds the default workspace.
-- * Already migrated through 0094_branding.sql: every CREATE is IF NOT EXISTS
--   and every seed is skipped, so nothing changes. The runner just records the
--   baseline as applied.
-- * Stopped partway through the old migrations: refused by the check below.
--   Update to the last release that shipped the old migrations, let it finish
--   migrating, then update to this one.
--
-- Never edit this file once released. Put schema and seed changes in a new,
-- higher-numbered migration.

-- Like every old migration, turn on foreign keys for this connection. SQLite
-- ignores this inside a transaction, so runners that wrap the file keep their
-- own setting.
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS _rtnote_baseline;

CREATE TABLE _rtnote_baseline (
  is_fresh INTEGER NOT NULL,
  legacy_migrations_complete INTEGER NOT NULL,
  CONSTRAINT "database stopped partway through the pre-baseline migrations; update to the last release before 0100_baseline.sql first" CHECK (legacy_migrations_complete = 1)
);

-- Every old migration chain began with 0001_initial.sql, which created
-- notebooks, and ended with 0094_branding.sql, which created branding_assets.
-- No notebooks table means an empty database; notebooks without
-- branding_assets means the old migrations stopped partway.
INSERT INTO _rtnote_baseline (is_fresh, legacy_migrations_complete)
SELECT
  NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'notebooks'),
  NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'notebooks')
    OR EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'branding_assets');

-- Users and sign-in

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_disabled INTEGER NOT NULL DEFAULT 0 CHECK (is_disabled IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  note_body_font TEXT,
  note_prose_font_size INTEGER,
  note_prose_line_height TEXT,
  note_prose_palette TEXT,
  note_prose_custom_css TEXT,
  note_prose_custom_colors TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username
  ON users(username, is_disabled);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_hash TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT,
  device_id TEXT,
  device_label TEXT,
  ip_address TEXT,
  ip_country TEXT,
  ip_region TEXT,
  mfa_restricted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
  ON sessions(token_hash, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_device
  ON sessions(user_id, device_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  scope TEXT NOT NULL CHECK (scope IN ('username', 'ip')),
  attempt_key TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at TEXT NOT NULL,
  blocked_until TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, attempt_key)
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_updated
  ON auth_login_attempts(updated_at);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  device_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_user
  ON auth_challenges(user_id, expires_at);

CREATE TABLE IF NOT EXISTS user_totp (
  user_id TEXT PRIMARY KEY,
  -- AES-GCM ciphertext of the active base32 secret; NULL until enabled.
  secret_encrypted TEXT,
  enabled_at TEXT,
  -- Highest accepted 30-second time step, so a code can never be replayed.
  last_used_step INTEGER NOT NULL DEFAULT 0,
  -- Enrollment or rebind in progress. The active secret stays valid until confirm.
  pending_secret_encrypted TEXT,
  pending_created_at TEXT,
  pending_verified_step INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  pending_session_id TEXT,
  pending_attempts INTEGER NOT NULL DEFAULT 0,
  pending_batch_id TEXT,
  pending_setup_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  session_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user
  ON user_recovery_codes(user_id, status, used_at);

CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(scopes_json)),
  last_used_at TEXT,
  expires_at TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  token_value TEXT,
  workspace_id TEXT NOT NULL DEFAULT 'ws_default'
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_workspace
  ON api_tokens(workspace_id, is_revoked, created_at DESC);

-- Workspaces

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  is_personal INTEGER NOT NULL DEFAULT 1 CHECK (is_personal IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  backup_revision INTEGER NOT NULL DEFAULT 0,
  scheduled_run_count INTEGER NOT NULL DEFAULT 0 CHECK (scheduled_run_count >= 0)
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_personal_user
  ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
  ON workspace_members(workspace_id, role);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_single_owner
  ON workspace_members(workspace_id)
  WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS workspace_extensions (
  workspace_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  extension_type TEXT NOT NULL CHECK (extension_type IN ('plugin', 'theme')),
  version TEXT NOT NULL CHECK (length(trim(version)) > 0 AND length(version) <= 80),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('marketplace', 'github', 'manifest')),
  verified INTEGER NOT NULL CHECK (verified IN (0, 1)),
  manifest_url TEXT NOT NULL CHECK (length(trim(manifest_url)) > 0 AND length(manifest_url) <= 2000),
  repository_url TEXT CHECK (repository_url IS NULL OR (length(trim(repository_url)) > 0 AND length(repository_url) <= 500)),
  release_tag TEXT CHECK (release_tag IS NULL OR (length(trim(release_tag)) > 0 AND length(release_tag) <= 80)),
  publisher TEXT CHECK (publisher IS NULL OR publisher = 'edgeever'),
  installed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (workspace_id, extension_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_extensions_workspace_updated
  ON workspace_extensions(workspace_id, deleted_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS workspace_seed_localizations (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workspace_example_seeds (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Notebooks

CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  workspace_id TEXT NOT NULL DEFAULT 'ws_default',
  color_target TEXT NOT NULL DEFAULT 'icon' CHECK (color_target IN ('icon', 'name', 'both')),
  is_bold INTEGER NOT NULL DEFAULT 0 CHECK (is_bold IN (0, 1)),
  text_color TEXT,
  icon_inverted INTEGER NOT NULL DEFAULT 0 CHECK (icon_inverted IN (0, 1)),
  row_inverted INTEGER NOT NULL DEFAULT 0 CHECK (row_inverted IN (0, 1)),
  CHECK (parent_id IS NULL OR parent_id <> id),
  FOREIGN KEY (parent_id) REFERENCES notebooks(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_notebooks_deleted
  ON notebooks(is_deleted, updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notebooks_one_active_inbox
  ON notebooks(workspace_id)
  WHERE is_deleted = 0 AND slug = 'inbox';

CREATE INDEX IF NOT EXISTS idx_notebooks_parent
  ON notebooks(parent_id, is_deleted, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_notebooks_workspace_parent
  ON notebooks(workspace_id, parent_id, is_deleted, sort_order, name);

-- Notes

CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL,
  title TEXT,
  excerpt TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  source_memo_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_memo_ids)),
  merge_source_count INTEGER NOT NULL DEFAULT 0 CHECK (merge_source_count >= 0),
  merged_into_memo_id TEXT,
  merged_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'user',
  updated_by TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  workspace_id TEXT NOT NULL DEFAULT 'ws_default',
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (merged_into_memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memos_archive_feed
  ON memos(is_archived, is_deleted, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memos_merge_target
  ON memos(merged_into_memo_id);

CREATE INDEX IF NOT EXISTS idx_memos_notebook_feed
  ON memos(notebook_id, is_deleted, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memos_trash_feed
  ON memos(is_deleted, deleted_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memos_workspace_archive_feed
  ON memos(workspace_id, is_archived, is_deleted, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memos_workspace_created_export
  ON memos(workspace_id, is_deleted, created_at, id);

CREATE INDEX IF NOT EXISTS idx_memos_workspace_id
  ON memos(workspace_id, id);

CREATE INDEX IF NOT EXISTS idx_memos_workspace_notebook_feed
  ON memos(workspace_id, notebook_id, is_deleted, updated_at DESC);

CREATE TABLE IF NOT EXISTS memo_contents (
  memo_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  content_markdown TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_contents_revision
  ON memo_contents(memo_id, revision);

CREATE TABLE IF NOT EXISTS memo_revisions (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  title TEXT,
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  content_markdown TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  content_text TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_revisions_memo
  ON memo_revisions(memo_id, revision DESC);

CREATE TABLE IF NOT EXISTS memo_edit_sessions (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent')),
  actor_id TEXT,
  base_revision INTEGER NOT NULL,
  base_content_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_edit_sessions_expiry
  ON memo_edit_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_memo_edit_sessions_memo
  ON memo_edit_sessions(memo_id, expires_at);

CREATE TABLE IF NOT EXISTS memo_tags (
  memo_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  PRIMARY KEY (memo_id, name),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_tags_workspace_name
  ON memo_tags(workspace_id, normalized_name, memo_id);

CREATE TABLE IF NOT EXISTS memo_import_sources (
  workspace_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (length(trim(source)) BETWEEN 1 AND 80),
  external_id TEXT NOT NULL CHECK (length(trim(external_id)) BETWEEN 1 AND 512),
  memo_id TEXT NOT NULL,
  source_updated_at TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (workspace_id, source, external_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_import_sources_memo
  ON memo_import_sources(workspace_id, memo_id);

CREATE TABLE IF NOT EXISTS memo_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  title TEXT,
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  content_markdown TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_templates_workspace_updated
  ON memo_templates(workspace_id, updated_at DESC, name);

-- Search

CREATE TABLE IF NOT EXISTS memo_search_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id TEXT NOT NULL UNIQUE,
  title TEXT,
  content_text TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS memos_fts USING fts5 (
  memo_id UNINDEXED,
  title,
  content_text,
  tags,
  content = 'memo_search_documents',
  content_rowid = 'id'
);

-- Attachments and object storage

CREATE TABLE IF NOT EXISTS object_storage_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('builtin', 's3')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  endpoint TEXT,
  region TEXT,
  bucket TEXT,
  access_key_id TEXT,
  secret_access_key_encrypted TEXT,
  force_path_style INTEGER NOT NULL DEFAULT 1 CHECK (force_path_style IN (0, 1)),
  object_prefix TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_object_storage_single_active
  ON object_storage_configs(is_active)
  WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  original_memo_id TEXT,
  bucket_name TEXT NOT NULL DEFAULT 'edgeever-resources',
  object_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'attachment')),
  mime_type TEXT,
  filename TEXT,
  byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  sha256 TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  storage_config_id TEXT NOT NULL DEFAULT 'builtin',
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (original_memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE SET NULL,
  UNIQUE (bucket_name, object_key)
);

CREATE INDEX IF NOT EXISTS idx_resources_memo
  ON resources(memo_id, is_deleted, kind);

CREATE INDEX IF NOT EXISTS idx_resources_object
  ON resources(bucket_name, object_key);

CREATE INDEX IF NOT EXISTS idx_resources_original_memo
  ON resources(original_memo_id);

CREATE INDEX IF NOT EXISTS idx_resources_storage_config
  ON resources(storage_config_id, object_key);

CREATE TABLE IF NOT EXISTS resource_uploads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  memo_id TEXT NOT NULL,
  resource_id TEXT NOT NULL UNIQUE,
  storage_config_id TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  provider_upload_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'attachment')),
  mime_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  part_size INTEGER NOT NULL CHECK (part_size > 0),
  part_count INTEGER NOT NULL CHECK (part_count > 0),
  restore_metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_uploads_workspace
  ON resource_uploads(workspace_id, expires_at);

CREATE TABLE IF NOT EXISTS resource_upload_parts (
  upload_id TEXT NOT NULL,
  part_number INTEGER NOT NULL CHECK (part_number > 0),
  etag TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (upload_id, part_number),
  FOREIGN KEY (upload_id) REFERENCES resource_uploads(id) ON DELETE CASCADE
);

-- Sharing and public pages

CREATE TABLE IF NOT EXISTS memo_shares (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  password_hash TEXT,
  unlock_failed_count INTEGER NOT NULL DEFAULT 0,
  unlock_window_started_at TEXT,
  unlock_blocked_until TEXT,
  password_encrypted TEXT,
  slug TEXT,
  show_details INTEGER NOT NULL DEFAULT 1,
  show_updated_at INTEGER NOT NULL DEFAULT 1,
  show_branding INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  branding_notebook_id TEXT,
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (memo_id),
  UNIQUE (token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memo_shares_slug
  ON memo_shares(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memo_shares_workspace
  ON memo_shares(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS memo_share_slug_claims (
  slug TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notebook_shares (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL UNIQUE REFERENCES notebooks(id) ON UPDATE CASCADE ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  password_hash TEXT,
  unlock_failed_count INTEGER NOT NULL DEFAULT 0,
  unlock_window_started_at TEXT,
  unlock_blocked_until TEXT,
  password_encrypted TEXT,
  site_slug TEXT,
  site_settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(site_settings_json) AND json_type(site_settings_json) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notebook_shares_site_slug
  ON notebook_shares(lower(site_slug))
  WHERE site_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notebook_shares_workspace
  ON notebook_shares(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS notebook_share_excluded_memos (
  share_id TEXT NOT NULL REFERENCES notebook_shares(id) ON UPDATE CASCADE ON DELETE CASCADE,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (share_id, memo_id)
);

CREATE INDEX IF NOT EXISTS idx_notebook_share_excluded_memos_memo
  ON notebook_share_excluded_memos(memo_id);

CREATE TABLE IF NOT EXISTS table_forms (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  token TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  password_hash TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  submit_label TEXT NOT NULL DEFAULT '',
  fields_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fields_json)),
  unlock_failed_count INTEGER NOT NULL DEFAULT 0,
  unlock_window_started_at TEXT,
  unlock_blocked_until TEXT,
  submit_count INTEGER NOT NULL DEFAULT 0,
  submit_window_started_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (memo_id),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_table_forms_workspace
  ON table_forms(workspace_id, updated_at DESC);

-- Branding

CREATE TABLE IF NOT EXISTS branding_profiles (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('instance', 'workspace', 'notebook')),
  workspace_id TEXT,
  notebook_id TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((scope = 'instance' AND id = 'instance' AND workspace_id IS NULL AND notebook_id IS NULL) OR (scope = 'workspace' AND id = 'workspace:' || workspace_id AND notebook_id IS NULL) OR (scope = 'notebook' AND id = 'notebook:' || notebook_id AND workspace_id IS NOT NULL)),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branding_profiles_workspace
  ON branding_profiles(workspace_id, scope);

CREATE TABLE IF NOT EXISTS branding_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branding_assets_workspace
  ON branding_assets(workspace_id, created_at);

-- Speech transcription (voice memos)

CREATE TABLE IF NOT EXISTS ai_transcription_providers (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai-compatible' CHECK (provider IN ('openai-compatible')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  base_url TEXT NOT NULL CHECK (length(trim(base_url)) > 0),
  api_key_encrypted TEXT NOT NULL DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_transcription_providers_workspace
  ON ai_transcription_providers(workspace_id, is_enabled, created_at);

CREATE TABLE IF NOT EXISTS ai_transcription_models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL CHECK (length(trim(model_id)) > 0),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (provider_id) REFERENCES ai_transcription_providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_transcription_models_provider
  ON ai_transcription_models(provider_id, created_at);

CREATE TABLE IF NOT EXISTS ai_transcription_workspace_settings (
  workspace_id TEXT PRIMARY KEY,
  default_model_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (default_model_id) REFERENCES ai_transcription_models(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Scheduled plugin tasks

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 120),
  task_type TEXT NOT NULL CHECK (task_type IN ('plugin-command')),
  task_payload_json TEXT NOT NULL CHECK (json_valid(task_payload_json)),
  cron_expression TEXT NOT NULL CHECK (length(trim(cron_expression)) > 0 AND length(cron_expression) <= 160),
  timezone TEXT NOT NULL CHECK (length(trim(timezone)) > 0 AND length(timezone) <= 80),
  executor_device_id TEXT NOT NULL CHECK (length(trim(executor_device_id)) >= 16 AND length(executor_device_id) <= 160),
  missed_run_policy TEXT NOT NULL DEFAULT 'run-once' CHECK (missed_run_policy IN ('run-once', 'skip')),
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  owner_plugin_id TEXT,
  plugin_schedule_key TEXT,
  run_count INTEGER NOT NULL DEFAULT 0 CHECK (run_count >= 0),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_tasks_plugin_schedule
  ON scheduled_tasks(workspace_id, owner_plugin_id, plugin_schedule_key)
  WHERE owner_plugin_id IS NOT NULL AND plugin_schedule_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_workspace_device
  ON scheduled_tasks(workspace_id, executor_device_id, is_enabled, updated_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_task_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  executor_device_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  error_message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (task_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_workspace_started
  ON scheduled_task_runs(workspace_id, started_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_workspace_task
  ON scheduled_task_runs(workspace_id, task_id, scheduled_for DESC);

-- Background jobs, sync and audit

CREATE TABLE IF NOT EXISTS poster_render_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  memo_id TEXT NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  expected_revision INTEGER NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','rendering','completed','failed')),
  claim_token TEXT,
  expires_at TEXT NOT NULL,
  result_revision INTEGER,
  error_code TEXT,
  created_at TEXT NOT NULL,
  commit_guard INTEGER NOT NULL DEFAULT 1 CHECK(commit_guard = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poster_render_active
  ON poster_render_jobs(workspace_id, memo_id)
  WHERE status IN ('pending','rendering');

CREATE INDEX IF NOT EXISTS idx_poster_render_pending
  ON poster_render_jobs(workspace_id, status, created_at);

CREATE TABLE IF NOT EXISTS mobile_sync_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('notebook', 'memo')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_mobile_sync_changes_workspace_cursor
  ON mobile_sync_changes(workspace_id, id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_learning
  ON audit_events(actor_id, actor_type, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
  ON audit_events(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_leases (
  name TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Triggers: Notebook tree integrity

CREATE TRIGGER IF NOT EXISTS trg_notebooks_prevent_cycles BEFORE UPDATE OF parent_id ON notebooks FOR EACH ROW WHEN NEW.parent_id IS NOT NULL BEGIN WITH RECURSIVE ancestors(id, parent_id) AS (SELECT id, parent_id FROM notebooks WHERE id = NEW.parent_id UNION ALL SELECT n.id, n.parent_id FROM notebooks n INNER JOIN ancestors a ON n.id = a.parent_id WHERE a.parent_id IS NOT NULL) SELECT RAISE(ABORT, 'notebook cycle detected') WHERE EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id); END;

-- Triggers: Normalized tags follow memos.tags_json

CREATE TRIGGER IF NOT EXISTS trg_memo_tags_insert AFTER INSERT ON memos WHEN json_array_length(NEW.tags_json) > 0 BEGIN INSERT OR IGNORE INTO memo_tags (memo_id, workspace_id, name, normalized_name) SELECT NEW.id, NEW.workspace_id, trim(CAST(value AS TEXT)), lower(trim(CAST(value AS TEXT))) FROM json_each(NEW.tags_json) WHERE trim(CAST(value AS TEXT)) <> ''; END;

CREATE TRIGGER IF NOT EXISTS trg_memo_tags_update AFTER UPDATE OF tags_json, workspace_id ON memos WHEN OLD.tags_json <> NEW.tags_json OR OLD.workspace_id <> NEW.workspace_id BEGIN DELETE FROM memo_tags WHERE memo_id = NEW.id; INSERT OR IGNORE INTO memo_tags (memo_id, workspace_id, name, normalized_name) SELECT NEW.id, NEW.workspace_id, trim(CAST(value AS TEXT)), lower(trim(CAST(value AS TEXT))) FROM json_each(NEW.tags_json) WHERE trim(CAST(value AS TEXT)) <> ''; END;

-- Triggers: Full-text index follows memo_search_documents

CREATE TRIGGER IF NOT EXISTS trg_memo_search_documents_insert AFTER INSERT ON memo_search_documents BEGIN INSERT INTO memos_fts (rowid, memo_id, title, content_text, tags) VALUES (NEW.id, NEW.memo_id, NEW.title, NEW.content_text, NEW.tags); END;

CREATE TRIGGER IF NOT EXISTS trg_memo_search_documents_delete AFTER DELETE ON memo_search_documents BEGIN INSERT INTO memos_fts (memos_fts, rowid, memo_id, title, content_text, tags) VALUES ('delete', OLD.id, OLD.memo_id, OLD.title, OLD.content_text, OLD.tags); END;

CREATE TRIGGER IF NOT EXISTS trg_memo_search_documents_update AFTER UPDATE ON memo_search_documents BEGIN INSERT INTO memos_fts (memos_fts, rowid, memo_id, title, content_text, tags) VALUES ('delete', OLD.id, OLD.memo_id, OLD.title, OLD.content_text, OLD.tags); INSERT INTO memos_fts (rowid, memo_id, title, content_text, tags) VALUES (NEW.id, NEW.memo_id, NEW.title, NEW.content_text, NEW.tags); END;

-- Triggers: Mobile sync change feed

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_notebooks_insert AFTER INSERT ON notebooks BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (NEW.workspace_id, 'notebook', NEW.id, 'upsert'); END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_notebooks_update AFTER UPDATE ON notebooks BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (NEW.workspace_id, 'notebook', NEW.id, (CASE WHEN NEW.is_deleted = 1 THEN 'delete' ELSE 'upsert' END)); END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_notebooks_delete AFTER DELETE ON notebooks BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (OLD.workspace_id, 'notebook', OLD.id, 'delete'); END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_memos_insert AFTER INSERT ON memos BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (NEW.workspace_id, 'memo', NEW.id, 'upsert'); END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_memos_update AFTER UPDATE ON memos BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (NEW.workspace_id, 'memo', NEW.id, 'upsert'); END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_sync_memos_delete AFTER DELETE ON memos BEGIN INSERT INTO mobile_sync_changes (workspace_id, entity_type, entity_id, operation) VALUES (OLD.workspace_id, 'memo', OLD.id, 'delete'); END;

-- Triggers: Backup revision counter: any change to backed-up rows bumps workspaces.backup_revision

CREATE TRIGGER IF NOT EXISTS trg_backup_notebooks_insert AFTER INSERT ON notebooks BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT NEW.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_notebooks_update AFTER UPDATE ON notebooks BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT OLD.workspace_id UNION SELECT NEW.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_notebooks_delete BEFORE DELETE ON notebooks BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT OLD.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memos_insert AFTER INSERT ON memos BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT NEW.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memos_update AFTER UPDATE ON memos BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT OLD.workspace_id UNION SELECT NEW.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memos_delete BEFORE DELETE ON memos BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT OLD.workspace_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_contents_insert AFTER INSERT ON memo_contents BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_contents_update AFTER UPDATE ON memo_contents BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id UNION SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_contents_delete BEFORE DELETE ON memo_contents BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_revisions_insert AFTER INSERT ON memo_revisions BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_revisions_update AFTER UPDATE ON memo_revisions BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id UNION SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_memo_revisions_delete BEFORE DELETE ON memo_revisions BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_resources_insert AFTER INSERT ON resources BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_resources_update AFTER UPDATE ON resources BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id UNION SELECT workspace_id FROM memos WHERE id = NEW.memo_id); END;

CREATE TRIGGER IF NOT EXISTS trg_backup_resources_delete BEFORE DELETE ON resources BEGIN UPDATE workspaces SET backup_revision = backup_revision + 1 WHERE id IN (SELECT workspace_id FROM memos WHERE id = OLD.memo_id); END;

-- Triggers: Scheduled run counters

CREATE TRIGGER IF NOT EXISTS scheduled_run_count_insert AFTER INSERT ON scheduled_task_runs BEGIN UPDATE workspaces SET scheduled_run_count = scheduled_run_count + 1 WHERE id = NEW.workspace_id; UPDATE scheduled_tasks SET run_count = run_count + 1 WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id; END;

CREATE TRIGGER IF NOT EXISTS scheduled_run_count_delete AFTER DELETE ON scheduled_task_runs BEGIN UPDATE workspaces SET scheduled_run_count = scheduled_run_count - 1 WHERE id = OLD.workspace_id; UPDATE scheduled_tasks SET run_count = run_count - 1 WHERE id = OLD.task_id AND workspace_id = OLD.workspace_id; END;

CREATE TRIGGER IF NOT EXISTS scheduled_run_count_move AFTER UPDATE OF workspace_id, task_id ON scheduled_task_runs WHEN OLD.workspace_id IS NOT NEW.workspace_id OR OLD.task_id IS NOT NEW.task_id BEGIN UPDATE workspaces SET scheduled_run_count = scheduled_run_count - 1 WHERE id = OLD.workspace_id AND OLD.workspace_id IS NOT NEW.workspace_id; UPDATE workspaces SET scheduled_run_count = scheduled_run_count + 1 WHERE id = NEW.workspace_id AND OLD.workspace_id IS NOT NEW.workspace_id; UPDATE scheduled_tasks SET run_count = run_count - 1 WHERE id = OLD.task_id AND workspace_id = OLD.workspace_id; UPDATE scheduled_tasks SET run_count = run_count + 1 WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id; END;

CREATE TRIGGER IF NOT EXISTS scheduled_run_count_task_identity AFTER UPDATE OF id, workspace_id ON scheduled_tasks WHEN OLD.id IS NOT NEW.id OR OLD.workspace_id IS NOT NEW.workspace_id BEGIN UPDATE scheduled_tasks SET run_count = (SELECT COUNT(*) FROM scheduled_task_runs r WHERE r.task_id = NEW.id AND r.workspace_id = NEW.workspace_id) WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS scheduled_run_count_workspace_identity AFTER UPDATE OF id ON workspaces WHEN OLD.id IS NOT NEW.id BEGIN UPDATE workspaces SET scheduled_run_count = (SELECT COUNT(*) FROM scheduled_task_runs r WHERE r.workspace_id = NEW.id) WHERE id = NEW.id; END;

-- Seeds: the default workspace for a new installation, in English.
--
-- First sign-in translates the names and the welcome note into the reader's
-- language while nobody has changed them (workspace_seed_localizations), and
-- copies the example notes in (workspace_example_seeds). The welcome note must
-- stay identical to buildWelcomeMemoContent("en-US") so it is recognised as
-- untouched; tests/baseline-migration.test.ts checks this.

INSERT INTO object_storage_configs (id, provider, display_name, force_path_style, object_prefix, is_active)
SELECT 'builtin', 'builtin', 'Built-in object storage', 1, '', 1
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO workspaces (id, name, is_personal)
SELECT 'ws_default', 'Personal workspace', 1
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, icon, color, sort_order)
SELECT 'nb_inbox', 'ws_default', NULL, 'Inbox', 'inbox', 'notebook', NULL, 10
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, icon, color, sort_order)
SELECT 'nb_projects', 'ws_default', NULL, 'Work Projects', 'work-projects', 'notebook', NULL, 20
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, icon, color, sort_order)
SELECT 'nb_learning', 'ws_default', NULL, 'Learning Resources', 'learning-resources', 'notebook', NULL, 30
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, icon, color, sort_order)
SELECT 'nb_creative', 'ws_default', NULL, 'Creative Ideas', 'creative-ideas', 'notebook', NULL, 40
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO notebooks (id, workspace_id, parent_id, name, slug, icon, color, sort_order)
SELECT 'nb_personal', 'ws_default', NULL, 'Personal Life', 'personal-life', 'notebook', NULL, 50
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memos (id, workspace_id, notebook_id, title, excerpt, tags_json, created_by, updated_by)
SELECT 'memo_welcome', 'ws_default', 'nb_inbox', 'Welcome to RTNote', 'This is your first RTNote note: three panes, running on the edge, ready for AI agents.', '["welcome"]', 'system', 'system'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_contents (memo_id, schema_version, content_json, content_markdown, content_text, content_hash, revision)
SELECT 'memo_welcome', 1, '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Welcome to RTNote"}]},{"type":"paragraph","content":[{"type":"text","text":"This is your first RTNote note: three panes, running on the edge, ready for AI agents."}]},{"type":"paragraph","content":[{"type":"text","text":"Next, create notebooks, write notes, search your content, and merge several notes into a new long-term note."}]}]}', '## Welcome to RTNote

This is your first RTNote note: three panes, running on the edge, ready for AI agents.

Next, create notebooks, write notes, search your content, and merge several notes into a new long-term note.', 'Welcome to RTNote This is your first RTNote note: three panes, running on the edge, ready for AI agents. Next, create notebooks, write notes, search your content, and merge several notes into a new long-term note.', 'bedccd0513eefde93a4537461d0cbf57545d888a8df9006077ae03c180f65ba5', 0
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_search_documents (memo_id, title, content_text, tags)
SELECT 'memo_welcome', 'Welcome to RTNote', 'Welcome to RTNote This is your first RTNote note: three panes, running on the edge, ready for AI agents. Next, create notebooks, write notes, search your content, and merge several notes into a new long-term note.', 'welcome'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_templates (id, workspace_id, name, description, title, content_json, content_markdown, tags_json)
SELECT 'ws_default_template_quick-note', 'ws_default', 'Quick Spark', 'Capture fleeting thoughts, ideas, links, and immediate action items.', 'Quick Spark', '{"type":"doc","content":[]}', '## 💡 Fleeting Thoughts

- 

## 📌 Context & Notes



## 🚀 Next Actions

- [ ] ', '["template","quick-note"]'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_templates (id, workspace_id, name, description, title, content_json, content_markdown, tags_json)
SELECT 'ws_default_template_meeting', 'ws_default', 'Meeting Minutes', 'Structured log for agenda, key decisions, and action items with owners.', 'Meeting Minutes', '{"type":"doc","content":[]}', '# 📝 Meeting Minutes

- **Time**:
- **Host/Recorder**:
- **Attendees**:

---

## 🎯 Goal

- 

## 💬 Discussion & Decisions

1. **[Topic 1]**
   - Points:
   - ✅ **Decision**:

2. **[Topic 2]**
   - Points:
   - ✅ **Decision**:

## 📋 Action Items

- [ ] **[Owner]** Task description (Due: MM-DD)
- [ ] **[Owner]** Task description (Due: MM-DD)
', '["template","meeting"]'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_templates (id, workspace_id, name, description, title, content_json, content_markdown, tags_json)
SELECT 'ws_default_template_weekly-review', 'ws_default', 'Weekly Review & Status', 'Summarize weekly highlights, blockers, and next week''s key priorities.', 'Weekly Review & Status', '{"type":"doc","content":[]}', '# 🗓️ Weekly Status Report

## 🌟 Highlights

- [x] **[Project/Feature]** Accomplishment details
- [x] **[Project/Feature]** Accomplishment details

## 🚧 Blockers & Risks

- ⚠️ **Blocker**: Reason and required support

## 🎯 Next Week Priorities

- [ ] 
- [ ] 
- [ ] 

## 💡 Reflection & Insights

- 
', '["template","weekly-review"]'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_templates (id, workspace_id, name, description, title, content_json, content_markdown, tags_json)
SELECT 'ws_default_template_reading', 'ws_default', 'Reading Note Card', 'Extract key takeaways, quotes, reflections, and connected concepts.', 'Reading Note Card', '{"type":"doc","content":[]}', '# 📖 Reading Note Card

- **Book/Article**:
- **Author/Source**:
- **Rating**: ⭐⭐⭐⭐⭐

---

## 💡 Key Takeaway

> 

## ✍️ Highlights & Quotes

> [Quote content]
> —— *Original Source*

## 🧠 Personal Reflections

- 

## 🔗 Action & Practice

- [ ] **Action Plan**:
', '["template","reading"]'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO memo_templates (id, workspace_id, name, description, title, content_json, content_markdown, tags_json)
SELECT 'ws_default_template_okr', 'ws_default', 'Goal & Task Breakdown', 'Define OKRs, Key Results, milestones, and task checklists.', 'Goal & Task Breakdown', '{"type":"doc","content":[]}', '# 🎯 Goal Breakdown

- **Period**:
- **Owner**:

---

## 📌 Objective

> 

## 📈 Key Results

- **KR 1**: Target metric -> Current progress
- **KR 2**: Target metric -> Current progress

## 🗓️ Milestones

- [ ] **Phase 1 (Date)**: Target
- [ ] **Phase 2 (Date)**: Target

## 📋 Execution Checklist

- [ ] 
- [ ] 
', '["template","okr"]'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO workspace_seed_localizations (workspace_id)
SELECT 'ws_default'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

INSERT INTO workspace_example_seeds (workspace_id)
SELECT 'ws_default'
WHERE (SELECT is_fresh FROM _rtnote_baseline) = 1;

DROP TABLE _rtnote_baseline;
