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

function ensureSearchAndRulebookSchema() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS rulebooks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL,
        source_path TEXT,
        imported_at INTEGER,
        imported_by TEXT REFERENCES user(id)
      );

      CREATE TABLE IF NOT EXISTS rulebook_sections (
        id TEXT PRIMARY KEY NOT NULL,
        rulebook_id TEXT NOT NULL REFERENCES rulebooks(id) ON DELETE CASCADE,
        number TEXT NOT NULL,
        title TEXT NOT NULL,
        chapter_number TEXT NOT NULL,
        chapter_title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS rule_citations (
        id TEXT PRIMARY KEY NOT NULL,
        section_id TEXT NOT NULL REFERENCES rulebook_sections(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        game_session_id TEXT REFERENCES game_sessions(id) ON DELETE CASCADE,
        entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
        excerpt TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS rulebook_bookmarks (
        id TEXT PRIMARY KEY NOT NULL,
        section_id TEXT NOT NULL REFERENCES rulebook_sections(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rulebook_quick_refs (
        id TEXT PRIMARY KEY NOT NULL,
        rulebook_id TEXT NOT NULL REFERENCES rulebooks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS search_docs USING fts5(
        doc_id UNINDEXED,
        campaign_id UNINDEXED,
        doc_type UNINDEXED,
        title,
        body,
        href UNINDEXED,
        tag UNINDEXED,
        tokenize = 'porter unicode61'
      );
    `);
  } catch {
    // Fresh DBs / race on first boot.
  }
}

ensureRuntimeSchema();
ensureSearchAndRulebookSchema();

export const sqliteDb = sqlite;
export const db = drizzle(sqlite, { schema });
