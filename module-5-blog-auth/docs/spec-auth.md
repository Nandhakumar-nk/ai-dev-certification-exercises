# JWT Authentication Spec

## 1. Requirements

User stories:
- As a visitor, I can read published posts and a single post's comments without logging in.
- As a new user, I can register with email/password/name and receive a JWT.
- As a returning user, I can log in with email/password and receive a JWT.
- As an authenticated user, I can create a post, which records me as its author.
- As a post's author, I can update or delete my own post.
- As any other authenticated user, I cannot update or delete a post I don't own.
- As an unauthenticated caller, I cannot create, update, or delete any post.
- As an attacker, I cannot brute-force login/register credentials at unlimited speed.
- As an authenticated user, I can log out, after which my token can no longer be used to access protected routes.

Acceptance criteria mirror the existing README's success criteria plus two additions:

- **Rate-limit behavior**: public GET routes require no auth; register/login issue working JWTs; write routes reject missing/invalid tokens with 401; write routes reject non-owners with 403; the 6th rapid login/register attempt from one IP within 15 minutes returns 429.
- **Logout behavior**: a token presented after its owner has logged out is rejected with 401 on every protected route.

## 2. Technical Design

### Data model (`prisma/schema.prisma`)

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   // bcrypt hash, never the plaintext
  name      String
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int       @id @default(autoincrement())
  title     String
  content   String
  published Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  comments  Comment[]
  authorId  Int
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
}

model BlacklistedToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

`Post.authorId` is required (not nullable). `Comment.authorName` stays untouched — it remains a free-text field with no relation to `User`; comments are out of scope for this change.

### API contracts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | unchanged |
| GET | `/api/posts` | none | unchanged, published only |
| GET | `/api/posts/:id` | none | unchanged |
| POST | `/api/posts/:id/comments` | none | unchanged |
| POST | `/api/auth/register` | none | rate-limited |
| POST | `/api/auth/login` | none | rate-limited |
| POST | `/api/auth/logout` | required | blacklists the presented token |
| POST | `/api/posts` | required | sets `authorId` from token |
| PUT | `/api/posts/:id` | required | 404 if missing, then 403 if not owner |
| DELETE | `/api/posts/:id` | required | 404 if missing, then 403 if not owner |

**`POST /api/auth/register`** — body `{ email, password, name }`.
- All fields required → `400` if any missing.
- Email format checked via regex → `400` if invalid.
- Password length ≥ 8 → `400` if shorter.
- Duplicate email → `409`.
- Success → `201 { token, user: { id, email, name } }` (never the password hash).

**`POST /api/auth/login`** — body `{ email, password }`.
- Missing fields → `400`.
- Unknown email or wrong password → `401` with the identical generic message `"Invalid email or password"` in both cases (no user-enumeration via error text).
- Success → `200 { token, user: { id, email, name } }`.

**`POST /api/auth/logout`** — requires `Authorization: Bearer <token>` (passes through `requireAuth`, so the token must already be valid and not already blacklisted). Inserts the raw token string into `BlacklistedToken` with `expiresAt` set from the token's own `exp` claim. Responds `200 { message: "Logged out successfully" }`.

**`PUT /api/posts/:id`, `DELETE /api/posts/:id`** — require the token. Check existence first (`404` if missing), then ownership (`existing.authorId !== req.user.id` → `403`), in that order. A query-filtered approach (`where: { id, authorId }`, collapsing "missing" and "not yours" into one generic 404) was considered and rejected — the two-step fetch-then-compare keeps 404 and 403 distinguishable, which the success criteria depend on.

### Middleware

**`src/middleware/auth.js` — `requireAuth`**:
1. Parse `Authorization: Bearer <token>` — missing/malformed → `401`.
2. `jwt.verify` against `process.env.JWT_SECRET` — invalid/expired → `401`.
3. Check `BlacklistedToken` for the raw token string — if found → `401 "Token has been revoked"`.
4. On success, set `req.user = { id, email }` and `req.token = <raw token>` (so `/api/auth/logout` can blacklist it without re-parsing the header), then `next()`.

Applied per-route, not globally via `app.use`, since GET routes must stay public. This adds one extra DB lookup per authenticated request — acceptable at this app's scale. No blacklist pruning/cleanup job is included: an expired token is already rejected by `jwt.verify` regardless of blacklist state, so pruning is not required for correctness (noted as optional future maintenance if table size becomes a concern).

**Rate limiter**: one `express-rate-limit` instance — `windowMs: 15 * 60 * 1000`, `max: 5`, keyed per-IP (the package's default). Applied to both `/api/auth/login` and `/api/auth/register`. Skipped when `process.env.NODE_ENV === "test"` (Vitest sets this automatically) so the automated test suite isn't throttled. Exceeding the limit returns `429`.

**JWT signing**: payload `{ id, email }`; secret from `process.env.JWT_SECRET` (loaded via `dotenv`; the app fails fast at startup if unset); `expiresIn` from `process.env.JWT_EXPIRES_IN || "24h"`.

**Password hashing**: `bcryptjs`, 12 salt rounds. Chosen over `argon2` because it's pure JavaScript with no native build step — appropriate for this app's scope, even though argon2id is the stronger OWASP-preferred algorithm in general.

### Security summary

- Passwords hashed with bcrypt, 12 rounds.
- JWT tokens expire in 24 hours; early revocation is possible via `/api/auth/logout`'s token blacklist.
- Login/register rate-limited to 5 attempts per 15 minutes per IP (`429` beyond that).
- Generic `"Invalid email or password"` message on login failure — no user-enumeration.
- Password hashes never appear in any API response.

## 3. Implementation Plan

1. `npm install jsonwebtoken bcryptjs dotenv express-rate-limit`.
2. Add `.env` (gitignored: `JWT_SECRET`, `JWT_EXPIRES_IN=24h`) + a committed `.env.example` with placeholder values.
3. Edit `prisma/schema.prisma`: add `User`, add `authorId`/`author` to `Post`, add `BlacklistedToken`.
4. Full reset: delete `prisma/dev.db` (or `npx prisma db push --force-reset`), then `npx prisma db push`. Chosen over a backfill or nullable-`authorId` approach — `dev.db` is gitignored/disposable and there's no real data to preserve.
5. Update `prisma/seed.js`: create a seed user, assign `authorId` on all seeded posts; run `npx prisma db seed`.
6. Create `src/middleware/auth.js` (`requireAuth`, including the blacklist check).
7. Edit `src/server.js`: `dotenv.config()` + a `JWT_SECRET`-unset guard at the top; add `POST /api/auth/register`, `POST /api/auth/login` (both rate-limited), and `POST /api/auth/logout` (behind `requireAuth`, writes to `BlacklistedToken`).
8. Edit `src/server.js`: apply `requireAuth` to `POST/PUT/DELETE /api/posts`; set `authorId` on create; add 404-then-403 ownership checks on PUT/DELETE (fetch-then-compare, not query-filtered).
9. Update `test/posts.test.js`: add user fixtures + signed tokens in `beforeAll`, attach auth headers to the existing POST tests, add new PUT/DELETE `describe` blocks (owner success, non-owner 403, no-token 401, missing-post 404-before-403), clean up `user` and `blacklistedToken` tables in `afterAll`.
10. Add `test/auth.test.js`: register/login happy paths, validation failures (400), duplicate email (409), bad credentials (401, identical message), and logout (login → logout → reuse same token on a protected route → expect 401), following the existing test file's Vitest/supertest/Prisma conventions.
11. Verify: `npm test` green; manual smoke test — register → login → create → cross-user 403 → no-token 401 → GET routes still public → logout then reuse token → 401 → 6 rapid logins → 429 on the 6th.

## 4. Scope Boundaries

What we will **not** build in this change:

- No changes to the comments endpoint or `Comment.authorName` (stays free text, unauthenticated).
- No refresh tokens (logout + token blacklist *are* in scope — see above).
- No blacklist pruning/cleanup job.
- No query-filtered ownership checks — ownership stays a separate fetch-then-compare step so 404 and 403 remain distinguishable.
- No route-file refactor (`src/routes/*.js`) — only `src/middleware/auth.js` is extracted from the monolithic `src/server.js`.
- No validation library (zod/joi) — manual inline checks, matching the existing style.
- No DB-backed account lockout or per-email attempt tracking — rate limiting is per-IP and in-memory only.
- No argon2 — bcryptjs only.
- No preservation of pre-existing `dev.db` post rows across the schema change — full reset instead of backfill.
- No OAuth / social login (future feature).
- No email verification (future feature).
- No password reset flow (future feature).
- No frontend changes — this is an API-only change; no UI exists in this repo to modify.

## 5. Success Criteria

- `npm test` passes, including new `test/auth.test.js` and the expanded `test/posts.test.js`.
- Manual smoke test confirms: public GET routes work with zero auth headers; register/login return usable JWTs; creating a post without a token returns 401; updating/deleting another user's post returns 403; updating/deleting your own post succeeds; a nonexistent post returns 404 even with a valid token and even when requested by a non-owner (proving 404 is checked before 403); 6 rapid login attempts from one IP trigger a 429 on the 6th; logging out then reusing the same token on a protected route returns 401.
- All endpoints return correct, spec-matching status codes (200/201/400/401/403/404/409/429).
- All unauthenticated write requests get 401.
- Each user can update/delete only their own posts — ownership restricts *writes*, not reads (published posts remain visible to everyone regardless of author; there is no per-user read-scoping in this app).
- Passwords are never stored in plain text (bcrypt hash only) and never appear in any API response.
