import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { baseSchema } from "./schema";

let database: Database.Database | null = null;
let databasePath: string | null = null;

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

function applySchema(instance: Database.Database): void {
  instance.exec(baseSchema);
  migrateLegacyToolCache(instance);
  instance.pragma("user_version = 2");
}

export function initializeDatabase(userDataPath: string): Database.Database {
  if (database) {
    return database;
  }

  fs.mkdirSync(userDataPath, { recursive: true });
  databasePath = path.join(userDataPath, "seccurity.sqlite");

  const instance = new Database(databasePath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  applySchema(instance);

  database = instance;
  return instance;
}

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
