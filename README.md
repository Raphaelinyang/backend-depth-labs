# Backend Depth Labs

Hands-on backend engineering labs built from scratch (Node.js, TypeScript, SQLite, Vitest) with zero auth-framework magic so every header, hash, transaction, and security boundary is implemented and tested directly.

## Labs
- [`week1-session-auth`](./week1-session-auth) — Raw HTTP cookie sessions, CSPRNG `<id>.<secret>` tokens, SHA-256 at-rest hashing, `timingSafeEqual`, CSRF `Origin` checks, session fixation rotation, and idle/absolute/sliding timeouts.

## Threat Model Notes (Fill in after completing Week 1)
- Why raw session secrets are hashed in the DB (and why SHA-256 is safe here vs Argon2id for passwords): _TODO_
- What `HttpOnly`, `Secure`, and `SameSite=Lax` each protect against (and what they do NOT stop): _TODO_
- How CSRF `Origin` checking and full server+browser logout work: _TODO_
- Why sliding expiration is throttled and paired with an absolute timeout: _TODO_
