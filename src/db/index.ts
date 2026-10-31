import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";
import { mkdirSync, existsSync } from "node:fs";

// 스크립트(npm run db:seed 등)로 실행할 때도 .env를 읽습니다. 이미 있는 환경변수는 덮어쓰지 않습니다.
if (existsSync(".env")) {
  try { process.loadEnvFile(".env"); } catch {}
}

const file = (process.env.DATABASE_URL ?? "file:./data/salesnote.db").replace(/^file:/, "");

mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };
const sqlite = globalForDb.sqlite ?? new Database(path.resolve(file));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export * from "./schema";
