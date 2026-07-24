# commitgen

A CLI that reads your **staged** Git changes and drafts a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/) message for you — no network calls, no API keys, just deterministic analysis of the diff. Accept it, edit it, ask for another take, or bail out, all before anything touches your repository.

```
$ commitgen
✔ Reading staged changes...

Suggested commit message:
feat(auth): add auth module

- Add src/auth/passwordReset.ts
- Update src/auth/login.ts

? What would you like to do with this commit message?
❯ Accept
  Edit manually
  Regenerate
  Cancel
```

## Installation

Requires Node.js 18+ and Git.

```bash
npm install
npm run build
npm link   # optional: exposes the `commitgen` command globally
```

During development you can skip the build step and run the TypeScript source directly:

```bash
npm start          # runs src/index.ts once via tsx
npm run dev        # same, but re-runs on file changes
```

## Usage

1. Stage the changes you want to commit:
   ```bash
   git add src/auth/login.ts
   ```
2. Run the tool from anywhere inside the repository:
   ```bash
   commitgen
   # or, without linking: npx tsx src/index.ts
   ```
3. Choose what to do with the suggested message:
   - **Accept** – runs `git commit -m "<message>"` immediately.
   - **Edit manually** – opens the message in your `$EDITOR` (falls back to `vi`) so you can rewrite it freely; the edited text becomes the final message.
   - **Regenerate** – re-derives the message with an alternate phrasing, without re-reading the diff from disk.
   - **Cancel** – exits without committing or modifying the working tree.

### Options

| Flag               | Description                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `-C, --cwd <path>` | Run as if `commitgen` was started in `<path>` instead of the current directory. |
| `-V, --version`    | Print the installed version.                                                    |
| `-h, --help`       | Show CLI help.                                                                  |

### What it validates before doing anything

- Git is installed and reachable on `PATH`.
- The current directory is inside a Git repository.
- There is at least one staged file (`git diff --staged` is non-empty).

Each failure prints a clear, colored message and exits with a non-zero code — the tool never modifies the working tree except by creating the final commit you explicitly accept.

## How the message is generated

Since there's no LLM in the loop, `commitgen` relies on transparent, testable heuristics over the staged diff:

1. **Type** – inferred from the changed files' categories (all tests → `test`, all docs → `docs`, all CI config → `ci`, all lockfiles/build config → `build`, all stylesheets/lint config → `style`), or, for regular source changes, from keywords in the diff (`fix`/`bug` → `fix`, `optimize`/`cache` → `perf`, `refactor`/`rename` → `refactor`), falling back to the shape of the change (pure additions → `feat`, pure deletions → `chore`).
2. **Scope** – the single directory segment shared by every changed file (e.g. `src/auth/login.ts` + `src/auth/session.ts` → `auth`); omitted when files span multiple modules.
3. **Subject** – an imperative phrase built from a verb (type-specific, with alternates used on "Regenerate") and either the humanized file name (single-file changes), the scope (multi-file changes), or a file count.
4. **Body** – a bulleted list of the added/modified/deleted/renamed files, included whenever more than one file changed.

## Project structure

```
src/
  ai/               Diff analysis heuristics and message wording (no I/O)
    __tests__/      Unit tests for this module
  cli/              Commander wiring + chalk/ora presentation (no business logic)
  commit/           Orchestrates git + ai; Conventional Commit formatting/validation
    __tests__/      Unit tests for this module
  git/              simple-git wrapper behind a small GitClient interface
    __tests__/      Unit tests for this module
  prompts/          @inquirer/prompts wrapper behind a small Prompter interface
  utils/            Custom error types, string helpers
  index.ts          Entry point
```

Each layer depends only on interfaces from the layers below it (`CommitWorkflow` knows about `GitClient`/`Prompter` as abstractions, never `simple-git` or `@inquirer/prompts` directly), which is what makes the whole flow unit-testable without a real terminal or repository.

Tests live in a `__tests__/` folder next to the code they cover, rather than mixed in alongside the implementation files — e.g. `src/ai/diffAnalyzer.ts` is tested by `src/ai/__tests__/diffAnalyzer.test.ts`. `npm run build` compiles from `tsconfig.build.json`, which excludes `**/*.test.ts`, so `dist/` never ships test code.

## Scripts

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run lint         # eslint .
npm run format       # prettier --write .
npm run build        # compile to dist/
```

## Testing

Unit tests cover the diff-analysis heuristics, message generation (including the regenerate variants and body truncation), Conventional Commit formatting/validation, and the full accept/edit/regenerate/cancel workflow (driven against a fake `GitClient` and `Prompter`, so no real Git repo or terminal is required).
