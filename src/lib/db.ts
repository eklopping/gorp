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

export const db = drizzle(sqlite, { schema });
