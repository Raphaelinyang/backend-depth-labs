import { DatabaseSync } from "node:sqlite";

export interface SessionRow {
  id: string;
  user_id: string;
  secret_hash: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  absolute_expires_at: number;
}

/**
 * Milestone 1 — Task 5:
 * Create and return a `DatabaseSync` instance (defaulting to ":memory:")
 * with a `sessions` table containing these exact columns:
 *   id TEXT PRIMARY KEY
 *   user_id TEXT NOT NULL
 *   secret_hash TEXT NOT NULL
 *   created_at INTEGER NOT NULL
 *   last_seen_at INTEGER NOT NULL
 *   expires_at INTEGER NOT NULL
 *   absolute_expires_at INTEGER NOT NULL
 * Plus an index on `user_id` (so "logout all devices" is fast).
 */
export function createDatabase(dbPath = ":memory:"): DatabaseSync {
  void DatabaseSync;
  void dbPath;
  throw new Error("TODO: implement createDatabase in src/db.ts");
}
