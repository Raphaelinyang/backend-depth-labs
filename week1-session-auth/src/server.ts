import http from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  createSession,
  invalidateAllUserSessions,
  invalidateSession,
  validateSession,
  type SessionPolicy
} from "./sessions.js";

export interface ServerOptions {
  db: DatabaseSync;
  allowedOrigin: string;
  isProduction?: boolean;
  policy?: SessionPolicy;
  now?: () => number;
}

export const DEFAULT_POLICY: SessionPolicy = {
  idleTtlMs: 30 * 60 * 1000, // 30 minutes
  absoluteTtlMs: 8 * 60 * 60 * 1000, // 8 hours
  refreshThresholdRatio: 0.5
};

/**
 * Milestone 2 & 3 — Raw `node:http` auth server (no Express!).
 *
 * Requirements:
 * 1. CSRF Guard: On any non-GET request (`POST`, `PUT`, `PATCH`, `DELETE`),
 *    the `Origin` header MUST exist and strictly equal `options.allowedOrigin`.
 *    Otherwise respond `403` with JSON `{ error: "Invalid origin" }`.
 *
 * 2. Cookie format (`session` cookie):
 *    - Active cookie: `session=<rawToken>; HttpOnly; SameSite=Lax; Path=/; Max-Age=<seconds>`
 *      (append `; Secure` if `options.isProduction === true`)
 *    - Cleared cookie: `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
 *      (append `; Secure` if `options.isProduction === true`)
 *
 * 3. Endpoints:
 *    - `POST /login`:
 *      * Parse JSON body `{ userId: string }`; return `400` if invalid/empty.
 *      * Session Fixation defense (Milestone 3): if request already has a valid `session` cookie,
 *        invalidate that old session in DB before creating a fresh one!
 *      * Create session, set active cookie, respond `200` with `{ userId, sessionId }`.
 *
 *    - `GET /me`:
 *      * Set `Cache-Control: private, no-store`.
 *      * Read `session` cookie from `req.headers.cookie` and validate via `validateSession`.
 *      * Return `401` if missing/invalid.
 *      * If `result.renewed === true`, also attach refreshed `Set-Cookie` header!
 *      * Return `200` with `{ userId: result.userId, sessionId: result.sessionId }`.
 *
 *    - `POST /logout`:
 *      * If request has a valid `session` cookie, invalidate that session in DB.
 *      * Always send cleared `Set-Cookie` (`Max-Age=0`) and return `200` `{ ok: true }`.
 *
 *    - `POST /logout-all`:
 *      * Validate `session` cookie; return `401` if missing/invalid.
 *      * Call `invalidateAllUserSessions(db, result.userId)`.
 *      * Send cleared `Set-Cookie` (`Max-Age=0`) and return `200` `{ ok: true }`.
 */
export function createAuthServer(options: ServerOptions): http.Server {
  void http;
  void options;
  void createSession;
  void validateSession;
  void invalidateSession;
  void invalidateAllUserSessions;
  throw new Error("TODO: implement createAuthServer in src/server.ts");
}
