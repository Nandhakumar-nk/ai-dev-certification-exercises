# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm install
npx prisma migrate deploy   # apply migrations (required before first run)
npm run dev                 # dev server at http://localhost:3000
npm run build                # production build
npm run start                 # run production build
npm run lint                   # ESLint (flat config: next/core-web-vitals + next/typescript)
npx prisma studio             # browse/edit SQLite data
npx prisma migrate dev --name <name>   # create a migration after editing prisma/schema.prisma
npm test                        # Vitest — applies migrations to test.db, then runs vitest run
```

Tests use Vitest (`vitest.config.mts`, Node environment). `npm test` runs `prisma migrate deploy` against a dedicated `test.db` (gitignored, isolated from the dev `dev.db`) before running the suite, so test runs never touch dev data. Route Handler tests call the exported `GET`/`POST` functions directly with a real `Request` and a `{ params: Promise.resolve({ id }) }` context — no HTTP server involved — against the real `prisma` singleton. See `src/app/api/posts/[id]/comments/route.test.ts` for the pattern.

## Architecture

This is a standalone Next.js 16 (App Router) + Prisma 7 + SQLite app — its own project root, not part of a workspace/monorepo with the sibling `module-*` directories.

- **No API routes.** There's no `pages/` dir and no `app/api/**`. Data flows directly through Prisma:
  - `src/app/page.tsx` is an async Server Component that queries `prisma.post.findMany(...)` directly and renders the list.
  - `src/app/actions.ts` (`"use server"`) exports the `createPost` Server Action, wired as the `action` prop on the form in `src/app/new-post-form.tsx`. It calls `revalidatePath("/")` after inserting.
- **Prisma client output is non-default.** The `client` generator in `prisma/schema.prisma` uses the Prisma 7 `prisma-client` provider with `output = "../src/generated/prisma"`, so the generated client lives in the source tree at `src/generated/prisma/` (gitignored, regenerate with `npx prisma generate` after pulling schema changes) rather than `node_modules/.prisma`. Import it via `@/generated/prisma/client`.
- **Config-file-based Prisma setup.** `prisma.config.ts` (Prisma 7's config mechanism, not schema-embedded) defines the schema/migrations paths and datasource URL, and explicitly does `import "dotenv/config"` because the Prisma CLI does not auto-load `.env` on its own.
- **DB access is a singleton with a driver adapter.** `src/lib/prisma.ts` builds `PrismaClient` with the `@prisma/adapter-better-sqlite3` adapter (not Prisma's default SQLite driver) and caches the instance on `globalThis` in non-production to survive dev hot-reloads.
- **Data model:** single `Post { id, title, body, createdAt }` in `prisma/schema.prisma`, backed by `dev.db` (SQLite file at project root, gitignored).
- Path alias `@/*` → `./src/*` (see `tsconfig.json`).
- No component library or Tailwind — styling is CSS Modules (`page.module.css`) + `globals.css`; fonts loaded via `next/font/google`.
