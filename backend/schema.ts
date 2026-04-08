export const baseSchema = `
  CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    scope TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model_hint TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tools (
    tool_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    executable_name TEXT NOT NULL,
    auto_detected_path TEXT,
    manual_path TEXT,
    resolved_path TEXT,
    path_source TEXT NOT NULL DEFAULT 'missing',
    version TEXT,
    detected INTEGER NOT NULL DEFAULT 0,
    launchable INTEGER NOT NULL DEFAULT 0,
    last_checked_at TEXT,
    last_launched_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    layout_mode TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspace_apps (
    workspace_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    launch_order INTEGER NOT NULL DEFAULT 0,
    window_slot TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (workspace_id, tool_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_sessions (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    workspace_id TEXT,
    executable_path TEXT,
    launch_source TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    pid INTEGER,
    exit_code INTEGER,
    metadata_json TEXT
  );

  CREATE TABLE IF NOT EXISTS standardized_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    target TEXT NOT NULL,
    severity TEXT NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tools_last_checked_at ON tools(last_checked_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON app_sessions(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON app_sessions(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON standardized_events(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_events_source_type ON standardized_events(source, type);
`;
