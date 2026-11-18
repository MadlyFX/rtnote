-- Server-side branding. One row per level: the instance default ('instance'),
-- a workspace ('workspace:<workspace id>') and a shared notebook site
-- ('notebook:<notebook id>'). settings_json holds only what the level overrides;
-- pages resolve instance -> workspace -> notebook at read time.
CREATE TABLE branding_profiles (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('instance', 'workspace', 'notebook')),
  workspace_id TEXT,
  notebook_id TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (scope = 'instance' AND id = 'instance' AND workspace_id IS NULL AND notebook_id IS NULL)
    OR (scope = 'workspace' AND id = 'workspace:' || workspace_id AND notebook_id IS NULL)
    OR (scope = 'notebook' AND id = 'notebook:' || notebook_id AND workspace_id IS NOT NULL)
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX idx_branding_profiles_workspace ON branding_profiles(workspace_id, scope);

-- Logos and favicons. They appear on sign-in and public pages, so they are
-- served without authentication under an unguessable id. workspace_id is NULL
-- for instance assets.
CREATE TABLE branding_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX idx_branding_assets_workspace ON branding_assets(workspace_id, created_at);

-- A single shared note uses its workspace's branding, or a chosen notebook's.
ALTER TABLE memo_shares ADD COLUMN branding_notebook_id TEXT;
