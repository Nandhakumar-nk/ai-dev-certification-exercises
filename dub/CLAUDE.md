# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dub is the open-source link attribution platform (short links, conversion tracking, affiliate/partner programs). It's a pnpm/Turborepo monorepo. Almost all product code lives in the single Next.js app at `apps/web` — the `packages/*` are mostly shared libraries (`@dub/ui`, `@dub/utils`, `@dub/email`) or standalone publishable packages (`cli`, `embeds/core`, `embeds/react`, `stripe-app`, `hubspot-app`).

The repo is "open core": `apps/web/app/(ee)/**` and `apps/web/app/(ee)/api/**` contain Enterprise Edition code (dashboards for admin.dub.co / partners.dub.co, partner programs, payouts, SAML/SCIM, etc.) covered by a commercial license; everything else is AGPLv3.

## Commands

Run from the repo root unless noted. Node v23.11.0 and pnpm 9.15.9 are the versions this repo targets.

```bash
pnpm install              # install all workspace deps
pnpm dev                  # turbo dev — runs apps/web on http://localhost:8888
pnpm build                # turbo build (all packages/apps)
pnpm lint                 # turbo lint
pnpm format               # prettier --write across the repo
pnpm prettier-check       # prettier --check (what CI runs)
pnpm test                 # turbo run test
```

Most day-to-day work happens inside `apps/web`, so `cd apps/web` first for these:

```bash
pnpm dev                        # next dev --turbopack --port 8888 (runs prisma:generate first)
pnpm build                      # next build (runs prisma:generate first)
pnpm test                       # vitest, single-file-parallelism, bails on first failure
pnpm vitest run tests/links/create-link.test.ts   # run a single test file
pnpm vitest run -t "public link"                   # run tests matching a name
pnpm test:e2e                   # playwright e2e tests
pnpm test:e2e:ui                 # playwright UI mode
pnpm prisma:push                # push schema/prisma changes to the DB without migrations
pnpm prisma:studio               # open Prisma Studio
pnpm prisma:format               # format prisma schema files
pnpm run script dev/seed         # seed dev data (add `--truncate` to wipe first)
pnpm run script <path>           # run any script in apps/web/scripts via tsx
```

Local infra (MySQL/PlanetScale proxy, Mailhog for local SMTP) is provided by `apps/web/docker-compose.yml`. Env vars are documented in `apps/web/.env.example` — copy it to `.env` before running anything.

### Testing notes

- Vitest specs in `apps/web/tests/**` are **integration tests that hit a real running server** over HTTP (see `tests/utils/http.ts`, `tests/utils/integration.ts`, `tests/utils/env.ts`) — they are not unit tests against mocked handlers. They require `E2E_BASE_URL`, `E2E_TOKEN`, `E2E_TOKEN_MEMBER`, `E2E_TOKEN_OLD`, and `E2E_PUBLISHABLE_KEY` to be set (see `.env.example`) and a live server (local or deployed) at that URL — expect them to fail with no setup, that's not a bug in your changes.
- `tests/setupTests.ts` mocks the Axiom logging SDKs (`@axiomhq/js`, `@axiomhq/logging`, `@axiomhq/nextjs`) globally so logging calls don't hit the network during tests.
- Playwright specs live in `apps/web/playwright/**`, split into `workspaces` and `partners` projects, each with its own `auth.setup.ts` that runs first and saves storage state.

## Architecture

### One Next.js app, many hostnames

`apps/web` serves several logically distinct products from one deployment, dispatched by hostname in `apps/web/middleware.ts` via `lib/middleware/utils/parse.ts`:

- **`APP_HOSTNAMES`** (app.dub.co) → `lib/middleware/app.ts` — the main workspace dashboard.
- **`API_HOSTNAMES`** (api.dub.co) → `lib/middleware/api.ts` — the public REST API.
- **`ADMIN_HOSTNAMES`** (admin.dub.co) → `lib/middleware/admin.ts` — internal admin dashboard (EE).
- **`PARTNERS_HOSTNAMES`** (partners.dub.co) → `lib/middleware/partners.ts` — the partner/affiliate portal (EE).
- Anything else is treated as a **custom short-link domain**: `lib/middleware/link.ts` handles redirects, `lib/middleware/create-link.ts` handles the "paste a URL after the domain to create a link" flow, and `/stats/*`, `/.well-known/*`, and legacy `dub.sh` redirects are handled inline in the middleware.

The `app/` directory mirrors this with Next.js route groups per surface: `app/app.dub.co/`, `app/(ee)/admin.dub.co/`, `app/(ee)/partners.dub.co/`, `app/[domain]/[key]` (the actual redirect page), plus `app/api/` (public API, open-source) and `app/(ee)/api/` (EE-only API routes, including all `cron/*` jobs).

### API route pattern

Routes under `app/api/**` and `app/(ee)/api/**` are thin: they parse/validate input with Zod schemas from `lib/zod/schemas/*`, then call into `lib/api/**` for business logic. Auth/authorization is applied via wrapper functions from `lib/auth` (`withWorkspace`, `withSession`, etc. — see `lib/auth/index.ts`), which inject `{ session, workspace, headers, searchParams, ... }` into the handler and enforce `requiredPermissions` (RBAC, see `lib/api/rbac`). Rate limiting uses `lib/upstash` (`ratelimit`). API errors are thrown as `DubApiError` (`lib/api/errors.ts`) with codes from `lib/api/error-codes.ts`.

### Data layer

- **Prisma / PlanetScale (MySQL)** is the primary datastore. The schema is split into many files under `apps/web/prisma/schema/*.prisma` (one per domain: `link`, `workspace`, `partner`, `payout`, `commission`, `program`, `fraud`, etc.) rather than one monolithic `schema.prisma`. Run `prisma:generate` after pulling schema changes.
- **Tinybird** (`packages/tinybird`, used via `lib/tinybird` and `lib/analytics`) stores click/lead/sale event analytics as append-only datasources with pipes (`packages/tinybird/pipes/*.pipe`) for querying — this is separate from Prisma and is where all click/conversion analytics reads come from.
- **Upstash Redis** is used for caching and rate limiting (`lib/upstash`); **Upstash QStash/Workflow** powers background jobs and cron-triggered work (`lib/cron`, `app/(ee)/api/cron/*`, `app/(ee)/api/workflows/*`).

### Shared packages

- `@dub/ui` (`packages/ui`) — shared React components (buttons, tables, charts, modals) used by all the dashboards.
- `@dub/utils` (`packages/utils`) — shared constants/functions, including the hostname sets (`APP_HOSTNAMES`, `API_HOSTNAMES`, `PARTNERS_HOSTNAMES`, etc.) used by the middleware.
- `@dub/email` (`packages/email`) — React Email templates sent via Resend.
- `packages/cli`, `packages/embeds/{core,react}`, `packages/stripe-app`, `packages/hubspot-app` — independently publishable packages; use their own `pnpm publish-*` root scripts.

### Auth

NextAuth.js (`lib/auth/options.ts`) handles workspace user auth; there's a separate auth flow for partners (`lib/auth/partner.ts`, `lib/auth/partner-users`). SAML/SSO goes through BoxyHQ Jackson (`lib/jackson.ts`), SCIM is under `app/(ee)/api/scim`.

## Style

- Prettier is enforced (`prettier-plugin-organize-imports` + `prettier-plugin-tailwindcss`) — run `pnpm format` before committing; CI runs `pnpm prettier-check`.
- Prisma schema formatting: `pnpm prisma:format` (run from `apps/web`).
