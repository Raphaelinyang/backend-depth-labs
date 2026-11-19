import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type SessionRow } from "../src/db.js";
import { createAuthServer } from "../src/server.js";

const ORIGIN = "https://innhubs.app";

function extractCookieValue(setCookieHeader: string | null): string {
  expect(setCookieHeader).toBeTruthy();
  const match = setCookieHeader!.match(/^session=([^;]*)/);
  expect(match).toBeTruthy();
  return match![1]!;
}

describe("Milestone 2: HTTP Cookies, DB Hash Isolation, CSRF & Logout", () => {
  let db: ReturnType<typeof createDatabase>;
  let server: ReturnType<typeof createAuthServer>;
  let baseUrl: string;

  beforeEach(async () => {
    db = createDatabase(":memory:");
    server = createAuthServer({
      db,
      allowedOrigin: ORIGIN,
      isProduction: true
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    db.close();
  });

  it("POST /login sets HttpOnly, Secure, SameSite=Lax, Path=/ cookie and NEVER stores the raw secret in SQLite", async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN
      },
      body: JSON.stringify({ userId: "user_raphael" })
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/Max-Age=\d+/);

    const rawToken = extractCookieValue(setCookie);
    const [sessionId, rawSecret] = rawToken.split(".");
    expect(sessionId).toBeTruthy();
    expect(rawSecret).toBeTruthy();

    // Verify raw secret is NEVER stored in the DB!
    const row = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(sessionId!) as SessionRow | undefined;
    expect(row).toBeDefined();
    expect(row!.user_id).toBe("user_raphael");
    expect(row!.secret_hash).not.toBe(rawSecret);
    expect(row!.secret_hash).not.toContain(rawSecret!);
  });

  it("GET /me authenticates a valid cookie, sets private no-store caching, and rejects tampered/missing cookies", async () => {
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ userId: "user_42" })
    });
    const rawToken = extractCookieValue(loginRes.headers.get("set-cookie"));

    // Valid cookie
    const okRes = await fetch(`${baseUrl}/me`, {
      headers: { Cookie: `session=${rawToken}` }
    });
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("cache-control")).toContain("no-store");
    const body = (await okRes.json()) as { userId: string; sessionId: string };
    expect(body.userId).toBe("user_42");

    // Missing cookie -> 401
    const noCookie = await fetch(`${baseUrl}/me`);
    expect(noCookie.status).toBe(401);

    // Tampered secret -> 401
    const tampered = `${rawToken}tampered`;
    const badRes = await fetch(`${baseUrl}/me`, {
      headers: { Cookie: `session=${tampered}` }
    });
    expect(badRes.status).toBe(401);
  });

  it("blocks cross-site CSRF POST requests with missing or mismatched Origin header (403)", async () => {
    const badOrigin = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil-phishing-site.com"
      },
      body: JSON.stringify({ userId: "user_1" })
    });
    expect(badOrigin.status).toBe(403);

    const missingOrigin = await fetch(`${baseUrl}/logout`, {
      method: "POST"
    });
    expect(missingOrigin.status).toBe(403);
  });

  it("POST /logout deletes the DB row AND clears the browser cookie with Max-Age=0 (blocking replay)", async () => {
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ userId: "user_logout" })
    });
    const rawToken = extractCookieValue(loginRes.headers.get("set-cookie"));

    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        Cookie: `session=${rawToken}`
      }
    });
    expect(logoutRes.status).toBe(200);
    const clearedCookie = logoutRes.headers.get("set-cookie");
    expect(clearedCookie).toContain("session=;");
    expect(clearedCookie).toContain("Max-Age=0");

    // Replaying the stolen old cookie MUST fail with 401 because the DB row was deleted
    const replayRes = await fetch(`${baseUrl}/me`, {
      headers: { Cookie: `session=${rawToken}` }
    });
    expect(replayRes.status).toBe(401);
  });

  it("POST /logout-all invalidates EVERY active session for that user across devices", async () => {
    const loginA = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ userId: "user_multi" })
    });
    const tokenA = extractCookieValue(loginA.headers.get("set-cookie"));

    const loginB = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ userId: "user_multi" })
    });
    const tokenB = extractCookieValue(loginB.headers.get("set-cookie"));

    // Log out all from Device A
    const outAll = await fetch(`${baseUrl}/logout-all`, {
      method: "POST",
      headers: { Origin: ORIGIN, Cookie: `session=${tokenA}` }
    });
    expect(outAll.status).toBe(200);

    // BOTH Device A and Device B are dead immediately
    const meA = await fetch(`${baseUrl}/me`, { headers: { Cookie: `session=${tokenA}` } });
    const meB = await fetch(`${baseUrl}/me`, { headers: { Cookie: `session=${tokenB}` } });
    expect(meA.status).toBe(401);
    expect(meB.status).toBe(401);
  });
});
