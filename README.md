# clone-tabnews

A clone of [TabNews](https://www.tabnews.com.br/), built as a personal study project with a focus on production-grade engineering practices over feature count — what the project calls **zero vibe-coding**: no copy-paste fixes that "just work," no shortcuts that wouldn't survive a code review.

---

## Status

The project is delivered milestone by milestone. Full board: [GitHub Milestones](https://github.com/Gui0206/clone-tabnews/milestones).

- **Milestone 0 — Em construção:** completed. Domain configured, code style and editor settings locked in.
- **Milestone 1 — Fundação:** in progress (4 of 9 issues closed).
  - Closed: folder architecture, automated integration tests, local PostgreSQL via Docker, migration system.
  - Open: CI ([#8](https://github.com/Gui0206/clone-tabnews/issues/8)), code linter ([#9](https://github.com/Gui0206/clone-tabnews/issues/9)), commit linter ([#10](https://github.com/Gui0206/clone-tabnews/issues/10)), staging/production database ([#11](https://github.com/Gui0206/clone-tabnews/issues/11)), license choice ([#12](https://github.com/Gui0206/clone-tabnews/issues/12)).

---

## Stack

- **Runtime:** Node.js (LTS Hydrogen) · **Framework:** Next.js 13 (Pages Router) · **UI:** React 18
- **Database:** PostgreSQL 16, run locally via Docker Compose
- **Migrations:** [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate)
- **Tests:** Jest, executed against a real database (no mocks)
- **CI:** GitHub Actions — tests + Prettier on every pull request
- **Deploy:** Vercel

---

## Engineering decisions

The bullets below describe choices made in the code and why they were made that way.

### Integration tests run against a real Postgres, not mocks

`npm test` boots a real PostgreSQL container, starts the Next.js dev server, waits for the API to report healthy via `/api/v1/status`, and only then runs Jest. Tests hit real HTTP endpoints and real SQL. Mocked databases pass too easily and miss the bugs that actually break production — broken migrations, connection leaks, malformed queries.

The test orchestrator ([tests/orchestrator.js](tests/orchestrator.js)) uses `async-retry` to poll the readiness endpoint up to 100 times before giving up, so the runner tolerates startup races on slow machines and in CI.

### A `/api/v1/status` endpoint that reports dependency state

[pages/api/v1/status/index.js](pages/api/v1/status/index.js) returns the Postgres version, `max_connections`, and current `open_connections`. It serves two purposes: a real readiness probe for the test orchestrator, and an honest "is the database actually reachable?" check for production. The response nests database details under a `dependencies` key so future dependencies (cache, queue, etc.) can be added without breaking the shape.

### Migrations exposed as an HTTP endpoint, with `GET` as a dry run

[pages/api/v1/migrations/index.js](pages/api/v1/migrations/index.js) wraps `node-pg-migrate`:

- `GET /api/v1/migrations` runs the migrator with `dryRun: true` and returns the list of pending migrations — a preview before commit.
- `POST /api/v1/migrations` applies them, returning `201` if any ran and `200` if none were pending.
- Anything other than `GET` or `POST` returns `405`.

A dedicated `pg` client is opened per request and explicitly closed in `finally`. In serverless environments, leaked connections are how you find out at 3 a.m. that your pool is too small.

### CI is split by concern

Two GitHub Actions workflows, both triggered on `pull_request`: [tests.yaml](.github/workflows/tests.yaml) runs Jest and [linting.yaml](.github/workflows/linting.yaml) runs Prettier. Splitting them means a failing test doesn't hide a formatting regression and vice versa, and either can be re-run independently.

### Environment-aware Postgres SSL

[infra/database.js](infra/database.js) enables SSL only when `NODE_ENV === "production"`. Local development stays simple; production stays correct. One line of code, but the kind of mismatch that costs an afternoon when it's wrong.

### Robust `npm test` orchestration

`npm test` uses `concurrently` to run `next dev` and `jest` together, hiding the Next.js output and tearing both down when Jest finishes (`-k -s command-jest`). Combined with the retry-based readiness check, the result is a single command that brings up everything, runs the suite, and exits cleanly — no manual setup steps.

---

## Running locally

Requires Node.js (LTS Hydrogen) and Docker.

```bash
npm install
npm run dev       # boots Postgres, waits for it, applies migrations, starts Next.js
npm test          # runs the full integration test suite
```

Other useful scripts:

```bash
npm run services:up        # start the database container only
npm run services:down      # stop and remove it
npm run migration:create   # scaffold a new migration file
npm run migration:up       # apply pending migrations against .env.development
npm run lint:prettier:fix  # auto-format the codebase
```

---

## Layout

```
pages/api/v1/          HTTP endpoints (status, migrations)
infra/database.js      Postgres client factory + query wrapper
infra/migrations/      node-pg-migrate migration files
infra/compose.yaml     Local Postgres definition
infra/scripts/         Operational scripts (e.g. wait-for-postgres)
tests/integration/     Jest tests against real endpoints
tests/orchestrator.js  Readiness probe used by the test runner
.github/workflows/     CI: tests + linting on every PR
```
