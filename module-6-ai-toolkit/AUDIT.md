# Codebase Audit

Combined findings from a parallel security, performance, and code-quality audit of the API in `src/`. Severity/impact ratings are per-agent judgment; entries are listed most severe first within each section.

## Security

| #   | File:Line                      | Issue                                                                                             | Severity |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------- | -------- |
| 1   | `src/routes/users.ts:31,44,76` | `password` field returned in every user API response (list, get, create)                          | Critical |
| 2   | `src/index.ts` + all routes    | No authentication/authorization anywhere — every CRUD endpoint is open to any caller              | Critical |
| 3   | `src/routes/users.ts:68`       | New users get a plaintext password, defaulting to the guessable `"default123"` if none supplied   | High     |
| 4   | `src/routes/users.ts:49,69`    | `role` accepted unrestricted from the request body — anyone can self-provision `"admin"`          | High     |
| 5   | `src/routes/tasks.ts:139-144`  | `PUT /:id` spreads the full `req.body` onto the stored task — mass assignment                     | High     |
| 6   | `src/routes/tasks.ts:108-127`  | `POST /api/tasks` has zero input validation                                                       | Medium   |
| 7   | `src/utils/helpers.ts:49-52`   | Weak email regex; no case normalization before the duplicate-email check                          | Medium   |
| 8   | `src/utils/helpers.ts:42-44`   | IDs generated via `Math.random()` — not cryptographically safe if ever used as a capability token | Low      |
| 9   | `src/index.ts`                 | No body-size limit or rate limiting                                                               | Low      |

## Performance

| #   | File:Line                                    | Issue                                                                                               | Severity |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| 1   | `src/routes/tasks.ts:74`                     | `require("./users")` called inside the per-task `.map()` loop — should be a static top-level import | Critical |
| 2   | `src/routes/tasks.ts:69-81`                  | N+1: linear `.find()` over all users, once per task → O(tasks × users)                              | Critical |
| 3   | `src/routes/tasks.ts:62-89`                  | `slugify`/`formatDate` recomputed from scratch on every request instead of cached/stored            | High     |
| 4   | `src/routes/tasks.ts:53-59`                  | Two sequential `.filter()` passes instead of one combined predicate                                 | Medium   |
| 5   | `src/routes/tasks.ts:49`                     | Unconditional `[...tasks]` copy even when no filters apply                                          | Low      |
| 6   | Various `.find()`/`.findIndex()` by id/email | O(n) scans standing in for a missing index — fine at this scale, would need a `Map` if data grows   | Low      |

## Code Quality

| #   | File:Line                                                    | Issue                                                                                                         | Severity    |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `src/routes/tasks.ts:46-92`                                  | `GET /api/tasks` handler mixes filtering, enrichment, cross-module join, and response shaping in one function | High        |
| 2   | `src/routes/tasks.ts:108-127` vs `src/routes/users.ts:48-77` | Inconsistent validation philosophy between the two route files, no shared validator                           | Medium-High |
| 3   | `src/routes/tasks.ts:8-41` vs `168-204`                      | Seed task data duplicated between the initializer and `resetTasks()`                                          | Medium      |
| 4   | `src/routes/users.ts:8-25` vs `84-102`                       | Same duplication pattern for seed users                                                                       | Medium      |
| 5   | `src/routes/tasks.ts:113-123,139-144`                        | Untyped `req.body` spread directly into a typed `Task`, defeating TypeScript's type checking                  | Medium      |
| 6   | 4 call sites across both route files                         | Identical "find-or-404" guard clause copy-pasted rather than extracted                                        | Low-Medium  |
| 7   | `src/index.ts:6`                                             | Hardcoded port, not `process.env.PORT`-overridable                                                            | Low         |

## Cross-cutting: one fix, three wins

`src/routes/tasks.ts:74`'s `require("./users")` inside the per-task loop was independently flagged by all three audits — it's a performance-critical N+1 pattern, a code-quality separation-of-concerns violation, and a security-adjacent smell (dynamic-require pattern, not itself exploitable here). Replacing it with a static `import { getUsers } from "./users"` plus a `Map<id, User>` built once before the loop resolves the top finding in two of the three audits simultaneously.

Inconsistent input validation between `tasks.ts` (none) and `users.ts` (partial) was flagged by both the security and code-quality audits from different angles — same root cause.

## Suggested priority order

1. **P0 (security):** strip `password` from all user responses; add an auth layer (even minimal)
2. **P1:** hash passwords / drop the default; restrict `role` assignment; fix `tasks.ts:74` (static import + `Map` lookup — kills the N+1 too)
3. **P1:** add validation to `POST`/`PUT /api/tasks`; lock down `role`/`status`/`priority` enums
4. **P2:** extract seed-data factories (dedupe); extract an `enrichTask`/service layer out of the `GET /api/tasks` handler; add a shared `findOrNotFound` helper
5. **P3:** cache slug/date, single-pass filtering, stronger email regex, non-guessable IDs, body-size limits

## Methodology: why parallel agents here

This audit ran as 3 parallel `Explore` subagents — independent AI helpers spawned to investigate in the background and report back — each reading the same 5-6 source files but working from a distinct rubric (a checklist of criteria to judge against): one for security, one for performance, one for code quality. A single sequential prompt covering all three angles at once would have been slower and shallower, for a few concrete reasons observed in this run:

1. **Orthogonal lenses, not shared attention.** Three distinct rubrics applied to the same files in one pass would dilute focus (spread attention thin across too much at once instead of concentrating it) or force re-reading the files three times anyway. Running them as separate agents let each one hold its one lens fully for the whole read.
2. **Independent reads reduce anchoring.** Each agent started cold, with no memory of the others' conclusions — so the performance read wasn't colored by whatever the security read had already flagged, and vice versa.
3. **Real wall-clock speedup.** The three agents took roughly 38s, 33s, and 43s respectively; running concurrently, total time was ~43s (the slowest one) instead of ~114s (the sum) for one after another — a genuine ~2.5x speedup, not just a tidiness win.
4. **Context isolation kept synthesis tractable.** Each agent's full transcript — every tool call and file read — stayed sandboxed in its own context. Only its digested findings summary came back, which is what made it possible to combine three thorough audits into one report without cutting any of them short for space.
5. **Convergent findings are signal.** All three agents independently flagged `src/routes/tasks.ts:74` (the `require("./users")` call inside the per-task loop) from their own angle — security called it a smell, performance called it the top N+1 (a query/lookup repeated once per item instead of batched once) issue, code quality called it a separation-of-concerns violation. That unprompted agreement across three independent reviewers is stronger evidence it's the single highest-leverage fix than one reviewer flagging it under a single category would be.
6. **Tradeoff.** This costs more tokens (three full reads of the codebase instead of one) and more upfront design work (three prompts plus a synthesis pass). It paid off here because the codebase was small (5-6 files) and the three lenses were genuinely independent — on a much larger codebase or with overlapping rubrics, the economics would look different.
