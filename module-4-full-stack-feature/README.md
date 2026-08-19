# Full-Stack Feature: Posts

A basic Next.js app with a Prisma + SQLite backed `Post` model. Lists all posts and includes a form to create new ones.

## Stack

- Next.js 16 (App Router, TypeScript)
- Prisma 7 + SQLite (via the `@prisma/adapter-better-sqlite3` driver adapter)

## Getting Started

Install dependencies and apply the database migration:

```bash
npm install
npx prisma migrate deploy
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the list of posts and the create-post form.

## Database

The `Post` model (`title`, `body`, `createdAt`) is defined in `prisma/schema.prisma`. The SQLite database file (`dev.db`) is created at the project root and is gitignored; `prisma/migrations/` tracks schema history.

To inspect the data:

```bash
npx prisma studio
```

## Project layout

- `src/app/page.tsx` — server-rendered list of posts
- `src/app/new-post-form.tsx` — the create-post form
- `src/app/actions.ts` — the `createPost` Server Action
- `src/lib/prisma.ts` — Prisma client singleton
