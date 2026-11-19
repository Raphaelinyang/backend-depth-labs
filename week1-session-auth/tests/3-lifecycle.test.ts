import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase, type SessionRow } from "../src/db.js";
import { createAuthServer } from "../src/server.js";
import { createSession, validateSession, type SessionPolicy } from "../src/sessions.js";

const ORIGIN = "https://innhubs.app";

const POLICY: SessionPolicy = {
  idleTtlMs: 30 * 60 * 1000, // 30 mins
  absoluteTtlMs: 120 * 60 * 1000, // 2 hours
  refreshThresholdRatio: 0.5 // extend only after 15 mins elapsed
};

describe("Milestone 3: Fixation Rotation, Idle/Absolute Timeouts & Throttled Sliding Renewal", () => {
  const cleanups: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      await cleanups.pop()!();
    }
  });

  it("enforces idle timeout and deletes expired sessions", () => {
    const db = createDatabase(":memory:");
    cleanups.push(() => db.close());

    const t0 = 1_700_000_000_000;
    const { rawToken, sessionId } = createSession(db, "u1", POLICY, t0);

    // 31 minutes of inactivity -> expired!
    const expired = validateSession(db, rawToken, POLICY, t0 + 31 * 60 * 1000);
    expect(expired).toBeNull();

    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
    expect(row).toBeUndefined();
  });

  it("throttles sliding expiration: no DB write before 50% elapsed, extends after 50%, never exceeds absolute timeout", () => {
    const db = createDatabase(":memory:");
    cleanups.push(() => db.close());

    const t0 = 1_700_000_000_000;
    const { rawToken, sessionId, expiresAt: initialExpiresAt } = createSession(db, "u1", POLICY, t0);

    // At +5 mins (< 15 min threshold): valid, NOT renewed, DB unchanged
    const early = validateSession(db, rawToken, POLICY, t0 + 5 * 60 * 1000);
    expect(early).not.toBeNull();
    expect(early!.renewed).toBe(false);
    expect(early!.expiresAt).toBe(initialExpiresAt);

    // At +20 mins (>= 15 min threshold): valid AND renewed to +50 mins from t0
    const renewed = validateSession(db, rawToken, POLICY, t0 + 20 * 60 * 1000);
    expect(renewed).not.toBeNull();
    expect(renewed!.renewed).toBe(true);
    expect(renewed!.expiresAt).toBe(t0 + 50 * 60 * 1000);

    // Keep staying active every 20 mins right up to the 120-min absolute cap
    validateSession(db, rawToken, POLICY, t0 + 40 * 60 * 1000);
    validateSession(db, rawToken, POLICY, t0 + 60 * 60 * 1000);
    validateSession(db, rawToken, POLICY, t0 + 80 * 60 * 1000);
    const nearCap = validateSession(db, rawToken, POLICY, t0 + 100 * 60 * 1000);
    expect(nearCap).not.toBeNull();
    // Cannot extend past absolute_expires_at (t0 + 120m)
    expect(nearCap!.expiresAt).toBe(t0 + 120 * 60 * 1000);

    // At +120 mins: hard absolute timeout kills the session even though user was active!
    const dead = validateSession(db, rawToken, POLICY, t0 + 120 * 60 * 1000);
    expect(dead).toBeNull();
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
    expect(row).toBeUndefined();
  });

  it("defends against Session Fixation: POST /login rotates away any existing session cookie", async () => {
    const db = createDatabase(":memory:");
    let currentTime = 1_700_000_000_000;
    const server = createAuthServer({
      db,
      allowedOrigin: ORIGIN,
      policy: POLICY,
      now: () => currentTime
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const baseUrl = `http://127.0.0.1:${port}`;
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
      db.close();
    });

    // Existing pre-login / old session
    const firstLogin = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ userId: "guest_1" })
    });
    const oldCookie = firstLogin.headers.get("set-cookie")!.match(/^session=([^;]*)/)![1]!;

    // Re-login while sending the old cookie -> MUST rotate to a brand-new ID and destroy old one
    const secondLogin = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
        Cookie: `session=${oldCookie}`
      },
      body: JSON.stringify({ userId: "admin_raphael" })
    });
    const newCookie = secondLogin.headers.get("set-cookie")!.match(/^session=([^;]*)/)![1]!;

    expect(newCookie).not.toBe(oldCookie);
    expect(newCookie.split(".")[0]).not.toBe(oldCookie.split(".")[0]);

    // Old pre-login session MUST be dead (401)
    const oldMe = await fetch(`${baseUrl}/me`, { headers: { Cookie: `session=${oldCookie}` } });
    expect(oldMe.status).toBe(401);

    // New session works as admin_raphael
    const newMe = await fetch(`${baseUrl}/me`, { headers: { Cookie: `session=${newCookie}` } });
    expect(newMe.status).toBe(200);
    expect(await newMe.json()).toMatchObject({ userId: "admin_raphael" });

    // Advance 20 mins -> GET /me should trigger sliding renewal & emit a refreshed Set-Cookie
    currentTime += 20 * 60 * 1000;
    const refreshedMe = await fetch(`${baseUrl}/me`, { headers: { Cookie: `session=${newCookie}` } });
    expect(refreshedMe.status).toBe(200);
    expect(refreshedMe.headers.get("set-cookie")).toContain(`session=${newCookie}`);
  });
});
