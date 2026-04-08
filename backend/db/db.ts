import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let database: Database.Database | null = null;
let databasePath: string | null = null;

function getProjectRoot(): string {
  return path.resolve(__dirname, "..", "..", "..");
}

function getSchemaPath(): string {
  return path.join(getProjectRoot(), "backend", "db", "schema.sql");
}

export function readSchemaSql(): string {
  return fs.readFileSync(getSchemaPath(), "utf8");
}

function tableExists(instance: Database.Database, tableName: string): boolean {
  const row = instance
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
      `
    )
    .get(tableName) as { name: string } | undefined;

  return Boolean(row);
}

function migrateLegacyToolCache(instance: Database.Database): void {
  if (!tableExists(instance, "tool_cache")) {
    return;
  }

  const hasTools = instance
    .prepare("SELECT COUNT(*) AS count FROM tools")
    .get() as { count: number };

  if (hasTools.count > 0) {
    return;
  }

  const timestamp = new Date().toISOString();
  instance.exec(`
    INSERT INTO tools (
      tool_id,
      name,
      description,
      category,
      executable_name,
      auto_detected_path,
      resolved_path,
      path_source,
      version,
      detected,
      launchable,
      last_checked_at,
      created_at,
      updated_at
    )
    SELECT
      tool_id,
      name,
      description,
      category,
      executable_name,
      install_path,
      install_path,
      CASE
        WHEN install_path IS NOT NULL THEN 'auto'
        ELSE 'missing'
      END,
      version,
      detected,
      launchable,
      last_checked_at,
      '${timestamp}',
      '${timestamp}'
    FROM tool_cache
  `);
}

function migrateLegacyEvents(instance: Database.Database): void {
  if (!tableExists(instance, "standardized_events") || !tableExists(instance, "events")) {
    return;
  }

  const hasEvents = instance
    .prepare("SELECT COUNT(*) AS count FROM events")
    .get() as { count: number };

  if (hasEvents.count > 0) {
    return;
  }

  const timestamp = new Date().toISOString();
  instance.exec(`
    INSERT INTO events (
      timestamp,
      source,
      type,
      target,
      severity,
      data_json,
      created_at
    )
    SELECT
      timestamp,
      source,
      type,
      target,
      severity,
      data_json,
      COALESCE(timestamp, '${timestamp}')
    FROM standardized_events
  `);
}

function applySchema(instance: Database.Database): void {
  instance.exec(readSchemaSql());
  migrateLegacyToolCache(instance);
  migrateLegacyEvents(instance);
  instance.pragma("user_version = 4");
}

export function initDatabase(databaseDirectory = path.join(process.cwd(), ".seccurity")): Database.Database {
  if (database) {
    return database;
  }

  fs.mkdirSync(databaseDirectory, { recursive: true });
  databasePath = path.join(databaseDirectory, "seccurity.sqlite");

  const instance = new Database(databasePath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  applySchema(instance);

  database = instance;
  return instance;
}

export const initializeDatabase = initDatabase;

export function getDatabase(): Database.Database {
  if (!database) {
    throw new Error("Database has not been initialized yet.");
  }

  return database;
}

export function getDatabasePath(): string {
  if (!databasePath) {
    throw new Error("Database path is not available before initialization.");
  }

  return databasePath;
}
