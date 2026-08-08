import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL ?? "./data/sessionnote.db";
const absolutePath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(/* turbopackIgnore: true */ process.cwd(), dbPath);

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const sqlite = new Database(absolutePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

function tableColumns(table: string) {
  return new Set(
    (
      sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );
}

function ensureColumn(table: string, column: string, ddl: string) {
  const cols = tableColumns(table);
  if (cols.has(column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

/** Keep live SQLite volumes in sync when drizzle-kit push is skipped or partial. */
function ensureRuntimeSchema() {
  try {
    const sessions = tableColumns("game_sessions");
    if (sessions.size > 0) {
      ensureColumn(
        "game_sessions",
        "sort_order",
        "sort_order INTEGER NOT NULL DEFAULT 0",
      );
    }

    const entityCols = tableColumns("entities");
    if (entityCols.size > 0) {
      ensureColumn("entities", "river_session_id", "river_session_id TEXT");
      ensureColumn(
        "entities",
        "sort_order",
        "sort_order INTEGER NOT NULL DEFAULT 0",
      );
    }

    const vault = tableColumns("vault_items");
    if (vault.size > 0) {
      ensureColumn(
        "vault_items",
        "crafter_type",
        "crafter_type TEXT NOT NULL DEFAULT 'craftsman'",
      );
      ensureColumn(
        "vault_items",
        "status",
        "status TEXT NOT NULL DEFAULT 'in_progress'",
      );
      ensureColumn("vault_items", "creator_user_id", "creator_user_id TEXT");
    }
  } catch {
    // Fresh DBs are created by drizzle-kit push on container start.
  }
}

ensureRuntimeSchema();

export const db = drizzle(sqlite, { schema });
