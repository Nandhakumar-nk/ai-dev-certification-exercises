# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

Node.js + TypeScript + Express. No external API keys or network calls — all weather data is generated in-process.

## Commands

```bash
npm run dev        # start with hot reload (tsx watch)
npm start          # start without hot reload
npm run build      # compile to dist/ via tsc
npm run typecheck  # tsc --noEmit
```

There is no test suite or linter configured. Verify changes by running `npm run dev` and curling the endpoints (see README.md).

## Code Style

- `async/await`, no callbacks
- Functional style — no classes
- 2-space indentation

## Architecture

Layered structure under `src/`, one responsibility per layer:

- `index.ts` — entrypoint. Only starts the HTTP server (`app.listen`). Has no route or business logic.
- `app.ts` — builds the Express app and mounts each router from `routes/`. This is the composition point for wiring new endpoints.
- `routes/*.route.ts` — one file per endpoint group (`health`, `weather`, `forecast`, `dashboard`). Each exports an Express `Router` and only handles request/response concerns, delegating data generation to `services/`.
- `services/weather.service.ts` — all mock weather generation. Exports `getWeatherForCity`, `getForecastForCity`, and `getConditionEmoji`.
- `views/dashboard.view.ts` — server-rendered HTML for `GET /`, built as a template-literal string with inline CSS (no client-side JS, no template engine).

To add a new endpoint: create a `*.route.ts` file, mount it in `app.ts`, and put any non-trivial data logic in `services/`.

### Deterministic mock data

Weather values are not random on every call — they're seeded from the city name so the same city always returns the same weather within a run. This works via a string hash (`hashString`) feeding a `mulberry32` PRNG, both in `weather.service.ts`. Forecasts seed each of the 5 days with `` `${city}-${dayIndex}` `` so days differ from each other but stay stable across requests. When changing data generation, preserve this determinism — don't swap in `Math.random()` directly.

Condition strings are mapped to emoji via `CONDITION_EMOJI` in the same file; add new conditions there if `CONDITIONS` is extended.
