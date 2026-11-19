import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db.js";
import {
  generateSessionToken,
  hashSecret,
  parseSessionToken,
  verifySecretHash
} from "../src/tokens.js";

describe("Milestone 1: Split Tokens, Hashing & Database Schema", () => {
  it("hashes a secret deterministically into a 64-character lowercase SHA-256 hex digest", () => {
    const h1 = hashSecret("my-random-secret");
    const h2 = hashSecret("my-random-secret");
    const h3 = hashSecret("other-secret");

    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("generates high-entropy <id>.<secret> tokens with CSPRNG randomness", () => {
    const t1 = generateSessionToken();
    const t2 = generateSessionToken();

    expect(t1.id.length).toBeGreaterThanOrEqual(32); // >= 16 random bytes (hex)
    expect(t1.secret.length).toBeGreaterThanOrEqual(64); // >= 32 random bytes (hex)
    expect(t1.rawToken).toBe(`${t1.id}.${t1.secret}`);
    expect(t1.secretHashHex).toBe(hashSecret(t1.secret));
    expect(t1.secretHashHex).not.toBe(t1.secret);
    expect(t1.id).not.toBe(t2.id);
    expect(t1.secret).not.toBe(t2.secret);
  });

  it("parses valid <id>.<secret> tokens and rejects malformed strings", () => {
    expect(parseSessionToken("abc123.sec456")).toEqual({ id: "abc123", secret: "sec456" });
    expect(parseSessionToken("")).toBeNull();
    expect(parseSessionToken("no-dot-here")).toBeNull();
    expect(parseSessionToken(".missing-id")).toBeNull();
    expect(parseSessionToken("missing-secret.")).toBeNull();
    expect(parseSessionToken("too.many.dots")).toBeNull();
  });

  it("verifies secret hashes safely in constant time without throwing on bad input", () => {
    const { secret, secretHashHex } = generateSessionToken();

    expect(verifySecretHash(secret, secretHashHex)).toBe(true);
    expect(verifySecretHash(secret + "x", secretHashHex)).toBe(false);
    expect(verifySecretHash(secret, "short")).toBe(false);
    expect(verifySecretHash(secret, "not-valid-hex-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false);
  });

  it("creates the SQLite sessions table with required columns and user_id index", () => {
    const db = createDatabase(":memory:");
    const cols = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);

    expect(colNames).toEqual(
      expect.arrayContaining([
        "id",
        "user_id",
        "secret_hash",
        "created_at",
        "last_seen_at",
        "expires_at",
        "absolute_expires_at"
      ])
    );

    const indexes = db.prepare("PRAGMA index_list(sessions)").all() as Array<{ name: string }>;
    expect(indexes.length).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
