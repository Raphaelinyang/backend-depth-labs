import crypto from "node:crypto";

export interface GeneratedToken {
  id: string;
  secret: string;
  rawToken: string;
  secretHashHex: string;
}

/**
 * Milestone 1 — Task 1:
 * Return the lowercase SHA-256 hex digest (64 hex chars) of `secret`.
 * Hint: crypto.createHash("sha256").update(...).digest("hex")
 */
export function hashSecret(secret: string): string {
  void secret;
  throw new Error("TODO: implement hashSecret in src/tokens.ts");
}

/**
 * Milestone 1 — Task 2:
 * Generate a split session token `<id>.<secret>` using a CSPRNG (`crypto.randomBytes`):
 * - `id`: at least 16 random bytes (32 hex chars)
 * - `secret`: at least 32 random bytes (64 hex chars)
 * - `rawToken`: `${id}.${secret}`
 * - `secretHashHex`: SHA-256 hex digest of `secret`
 */
export function generateSessionToken(): GeneratedToken {
  void crypto;
  throw new Error("TODO: implement generateSessionToken in src/tokens.ts");
}

/**
 * Milestone 1 — Task 3:
 * Parse a raw `<id>.<secret>` string.
 * Return `{ id, secret }` only if there is EXACTLY one "." and both parts are non-empty.
 * Otherwise return `null`.
 */
export function parseSessionToken(rawToken: string): { id: string; secret: string } | null {
  void rawToken;
  throw new Error("TODO: implement parseSessionToken in src/tokens.ts");
}

/**
 * Milestone 1 — Task 4:
 * Hash `incomingSecret` with SHA-256 and compare it against `storedHashHex`
 * using constant-time comparison (`crypto.timingSafeEqual`).
 * Must return `false` safely (never throw RangeError) if `storedHashHex` is invalid hex or wrong length.
 */
export function verifySecretHash(incomingSecret: string, storedHashHex: string): boolean {
  void incomingSecret;
  void storedHashHex;
  throw new Error("TODO: implement verifySecretHash in src/tokens.ts");
}
