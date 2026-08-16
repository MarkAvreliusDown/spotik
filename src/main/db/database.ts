import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS translations (
    hash TEXT PRIMARY KEY,
    translated TEXT NOT NULL
  );
`;

let dbPromise: Promise<Database> | null = null;

function dbPath(): string {
  return path.join(app.getPath("userData"), "spotik.db");
}

/**
 * sql.js — SQLite, скомпилированный в WASM, а не нативный аддон: работает
 * без node-gyp/Visual Studio Build Tools и без пересборки под ABI Electron
 * (см. better-sqlite3 в истории решений). Плата — база целиком живёт в
 * памяти и сериализуется на диск вручную после каждой группы записей
 * (persist()), а не пишется потранзакционно самим движком.
 */
async function openDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  });

  const file = dbPath();
  const existing = fs.existsSync(file) ? fs.readFileSync(file) : undefined;
  const db = new SQL.Database(existing);
  db.run(SCHEMA);
  return db;
}

export function getDatabase(): Promise<Database> {
  if (!dbPromise) dbPromise = openDatabase();
  return dbPromise;
}

export async function persist(): Promise<void> {
  const db = await getDatabase();
  const data = db.export();
  fs.writeFileSync(dbPath(), Buffer.from(data));
}
