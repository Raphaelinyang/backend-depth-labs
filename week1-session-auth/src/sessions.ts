import type { DatabaseSync } from "node:sqlite";
import type { SessionRow } from "./db.js";
import { generateSessionToken, parseSessionToken, verifySecretHash } from "./tokens.js";

export interface SessionPolicy {
  /** Idle expiration window in milliseconds (e.g., 30 minutes). */
  idleTtlMs: number;
  /** Hard absolute lifetime ceiling in milliseconds (e.g., 8 hours). */
  absoluteTtlMs: number;
  /** Fraction of idleTtlMs that must elapse before extending (default 0.5). */
  refreshThresholdRatio?: number;
}

export interface CreatedSession {
  rawToken: string;
  sessionId: string;
  expiresAt: number;
}

export interface ValidatedSession {
  sessionId: string;
  userId: string;
  renewed: boolean;
  expiresAt: number;
}

/**
 * Milestone 2 & 3 — Create a new session in SQLite:
 * 1. Generate a split token with `generateSessionToken()`
 * 2. Compute `expiresAt = nowMs + policy.idleTtlMs`
 *    and `absoluteExpiresAt = nowMs + policy.absoluteTtlMs`
 * 3. Insert ONLY `id` and `secretHashHex` (NEVER the raw secret!) into `sessions`
 * 4. Return `{ rawToken, sessionId: id, expiresAt }`
 */
export function createSession(
  db: DatabaseSync,
  userId: string,
  policy: SessionPolicy,
  nowMs = Date.now()
): CreatedSession {
  void db;
  void userId;
  void policy;
  void nowMs;
  void generateSessionToken;
  throw new Error("TODO: implement createSession in src/sessions.ts");
}

/**
 * Milestone 2 & 3 — Validate a raw `<id>.<secret>` token:
 * 1. Parse rawToken (return null if malformed)
 * 2. Fetch row from `sessions` by `id` (return null if missing)
 * 3. Verify secret hash in constant time (return null if invalid)
 * 4. Check timeouts: if `nowMs >= row.expires_at` OR `nowMs >= row.absolute_expires_at`,
 *    delete the expired row from `sessions` and return null
 * 5. Throttled sliding expiration (Milestone 3):
 *    - Let ratio = policy.refreshThresholdRatio ?? 0.5
 *    - If `nowMs - row.last_seen_at >= policy.idleTtlMs * ratio`:
 *        newExpiresAt = Math.min(nowMs + policy.idleTtlMs, row.absolute_expires_at)
 *        UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?
 *        return { sessionId: row.id, userId: row.user_id, renewed: true, expiresAt: newExpiresAt }
 *    - Otherwise do NOT write to DB; return renewed: false with existing row.expires_at
 */
export function validateSession(
  db: DatabaseSync,
  rawToken: string,
  policy: SessionPolicy,
  nowMs = Date.now()
): ValidatedSession | null {
  void db;
  void rawToken;
  void policy;
  void nowMs;
  void parseSessionToken;
  void verifySecretHash;
  type _Row = SessionRow;
  throw new Error("TODO: implement validateSession in src/sessions.ts");
}

/**
 * Delete a single session row by `id`.
 */
export function invalidateSession(db: DatabaseSync, sessionId: string): void {
  void db;
  void sessionId;
  throw new Error("TODO: implement invalidateSession in src/sessions.ts");
}

/**
 * Delete ALL session rows belonging to `userId` ("Log out all devices").
 */
export function invalidateAllUserSessions(db: DatabaseSync, userId: string): void {
  void db;
  void userId;
  throw new Error("TODO: implement invalidateAllUserSessions in src/sessions.ts");
}
