## Conventions

### TypeScript strict mode
- `strict: true` in tsconfig.json; `src/` is the compiled root, `test/` is excluded from the build
- Shared types live in one file, `src/types.ts`, as PascalCase singular interfaces (`Task`, `User`)
- Enums are modeled as string-literal unions (`status: "todo" | "in-progress" | "done"`), not TS `enum`
- Express handlers are explicitly typed: `(req: Request, res: Response) => void`

### API response format
- JSON responses are wrapped in an object keyed by the resource name, not a generic `data` field: `{ task }`, `{ tasks, total }`, `{ user }`, `{ users, total }`, `{ message, task }` for deletes
- Errors return `{ error: "<message>" }` with the HTTP status set accordingly — no generic `success` flag

### Error handling patterns
- Guard-clause style: `if (!x) { res.status(...).json({ error: "..." }); return; }`, repeated per handler — no centralized error middleware or try/catch
- Status codes in use: 200 (ok), 201 (created), 400 (validation), 404 (not found), 409 (conflict/duplicate)
- Validation coverage is currently inconsistent: `users.ts` validates email format and duplicate email, `tasks.ts` validates nothing on create/update

### Testing approach
- vitest + supertest, one `test/<resource>.test.ts` file per route module (currently only `tasks.test.ts` exists — `users.test.ts` is a known gap)
- Route modules export `reset<Resource>()` (and sometimes `get<Resource>()`) specifically so tests can reset in-memory state via `beforeEach`
- Assertions check `res.status` and `res.body` shape directly against the response-format convention above

### Naming conventions
- Route files: plural resource name (`tasks.ts`, `users.ts`) under `src/routes/`, each exporting a default `Router`
- Pure helpers: camelCase functions in `src/utils/helpers.ts` (`generateId`, `slugify`, `formatDate`, `isValidEmail`)
- Types: PascalCase singular interfaces in `src/types.ts`
- Seed/record IDs: `"<resource>-<3-digit-number>"` (e.g. `"task-001"`, `"user-002"`)
- Routes: RESTful, plural root + `:id` (`/api/tasks`, `/api/tasks/:id`)
