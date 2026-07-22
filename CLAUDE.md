# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A lightweight cash flow projection app for a small business. It replaces a Supabase + Budibase + Metabase stack with a self-hosted React + Express + PostgreSQL solution deployable via Docker. It shows a rolling 13-week cash flow forecast based on upcoming invoices and bills.

## Running the app

```bash
# Copy and fill in config first (POSTGRES_PASSWORD, AUTH_PASSWORD, AUTH_SECRET)
cp .env.example .env

# Start everything (db, api, web)
docker compose up --build

# Web: http://localhost:8080  (override with WEB_PORT)
```

**Production serving**: the `web` container builds the SPA to static files and serves them via non-root nginx (`web/nginx.conf`), reverse-proxying `/api` to the `api` container. Only the web port is published to the host — the API and DB are reachable only on the internal Docker network. `WEB_PORT` sets the host port; `API_PORT` only matters in dev (below).

**Configuration** lives in a `.env` file (gitignored) that `docker compose` reads automatically; `.env.example` and the README table document every variable. Required secrets have no defaults and fail fast: `docker compose` won't start without `POSTGRES_PASSWORD`, and the API exits at startup if `DB_PASSWORD` is missing or (with auth enabled) `AUTH_PASSWORD`/`AUTH_SECRET` are unset. Auth is **on by default**; use `AUTH_DISABLED=true` for trusted-LAN use. Set `DEMO_DATA=true` to seed a fictional demo dataset into a fresh (empty) database.

## Local development

Two options:

```bash
# 1. Full stack in Docker with hot reload + API exposed on the host
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The dev override (`docker-compose.dev.yml`) swaps the web container to the Vite dev server (still on 8080), mounts source for live editing, runs the API with `node --watch`, and publishes the API on `API_PORT`.

```bash
# 2. Services directly on your machine (DB still in Docker)
docker compose up db
cd api && npm install && DB_PASSWORD=... npm run dev   # requires DB_PASSWORD set
cd web && npm install && npm run dev                   # Vite dev server on :5173
```

For option 2 the web dev server proxies `/api` to `API_TARGET` (default `http://api:3000`); set `API_TARGET=http://localhost:3000` when running the API on the host.

## Architecture

Three services in `docker-compose.yml`:

- **`db`** — Postgres 16, empty by default. Schema is **not** created by initdb scripts; the API applies migrations on startup (see below). Persistent volume `postgres_data`. Not published to the host.
- **`api`** — Express app (`api/src/index.js`). Connects to Postgres via `pg` Pool (`api/src/db.js`). Routes in `api/src/routes/` — one file per resource: `balance`, `categories`, `dashboard`, `projects`, `transactions`. Auth lives in `api/src/auth.js`. On startup it runs `migrate()` (`api/src/migrate.js`) then `maybeSeedDemo()` (`api/src/seed.js`) before listening.
- **`web`** — React + Vite SPA (`web/src/`). Tailwind CSS + Recharts. `web/src/api.js` is the sole HTTP client (thin wrapper around `fetch`). Pages in `web/src/pages/` map 1-to-1 to nav items and API routes. Built by a multi-stage `web/Dockerfile` (`build` → nginx `production`; a `dev` stage runs the Vite server for the dev override). All three services have healthchecks; `api` exposes an unauthenticated `GET /api/health` for its probe.

## Key design details

**Dashboard query** (`api/src/routes/dashboard.js`): The core business logic lives here as three SQL queries (running balance, receipts by counterparty, payments by category). The 13-week projection starts from the most recent `balance` entry date. A shared `entriesCte` string expands both non-recurring (unpaid only) and recurring transactions into dated entries within the window; recurring rows step by their frequency's interval (weekly/monthly/quarterly/annually) from `due_date` via a `LATERAL generate_series`, stopping at `recurrence_end` if set.

**No ORM** — all DB access is raw SQL via `pg.Pool`. Keep new queries consistent with this style.

**API proxy** — Vite proxies `/api/*` to the API service, so the web app makes relative `/api/` calls. No base URL configuration needed in the frontend.

**Database schema & migrations**: the schema is defined by ordered SQL files in `api/migrations/` (`0001_initial_schema.sql`, `0002_recurrence_end.sql`, …), applied on API startup by `api/src/migrate.js` — a minimal raw-SQL runner (no dependency) that records applied files in a `schema_migrations` table, wraps each in a transaction, and serializes concurrent starts with a Postgres advisory lock. To add a schema change, drop a new `NNNN_name.sql` file in `api/migrations/`. **Backward compatibility**: if it finds an existing `transaction` table but no `schema_migrations` rows (a database created by the pre-migrations `init.sql`), it baselines `0001` as applied rather than re-running it. Demo data (`api/demo-seed.sql`) is seeded by `maybeSeedDemo()` only when `DEMO_DATA=true` and `balance` is empty. There are four tables — `category`, `project`, `balance`, and `transaction`. `transaction` is the central table with `is_income BOOLEAN` (TRUE = invoice/income, FALSE = bill/expense), `counterparty`, `category` FK (expenses only), `project_id` FK, `paid BOOLEAN`, `recurrence TEXT` (NULL or `'weekly'`/`'monthly'`/`'quarterly'`/`'annually'`), and `recurrence_end DATE` (optional; recurrence stops after it). `balance` holds point-in-time snapshots; the latest entry is used as the projection start date.

**Recurrence behaviour**: recurring transactions (any non-null `recurrence`) are always projected forward regardless of `paid` status — the paid toggle is hidden for them in the UI. Non-recurring paid transactions are excluded from the dashboard projection.

**Authentication** (`api/src/auth.js`): single-user login. The API mounts `/api/auth/*` (login/logout/me) publicly, then applies `authMiddleware` to protect all other `/api/*` routes. A successful login sets a signed, httpOnly `session` cookie (HMAC-SHA256 over the payload using `AUTH_SECRET`, via Node's built-in `crypto` — no JWT library). Credentials come from env: `AUTH_PASSWORD` (plaintext) or `AUTH_PASSWORD_HASH` (bcrypt, takes precedence). `assertAuthConfig()` runs at startup and exits the process if auth is enabled but unconfigured. `AUTH_DISABLED=true` bypasses everything for trusted LANs. Login is rate-limited in-memory per IP. On the frontend, `App.jsx` gates the whole SPA on `GET /api/auth/me` and shows `pages/Login.jsx` when unauthenticated; `web/src/api.js` dispatches an `auth:unauthorized` window event on any 401 so an expired session drops back to the login screen.

**Empty state**: with no `balance` row the dashboard query returns empty arrays (guarded in `dashboard.js`) and the UI shows an onboarding prompt instead of a broken chart.

## Legacy reference files

`schema.sql` (repo root) is the **old Supabase schema**, kept for context only — it is not runnable and does not reflect the current database (it still has separate `invoice`/`bill` tables, since consolidated into `transaction`). The live schema is defined by the migrations in `api/migrations/`. `Requirements.md` is the original migration brief describing the Supabase + Budibase + Metabase stack this app replaced.

## Testing and linting

Both packages have `lint` (ESLint flat config), `format` / `format:check` (Prettier, shared `.prettierrc.json`), and `test` scripts. Run them per package:

```bash
cd api && npm run lint && npm run format:check && npm test
cd web && npm run lint && npm run format:check && npm test
```

- **API tests** (`api/test/`, Node's built-in `node --test`): `auth.test.js` unit-tests `auth.js` with no DB; `api.test.js` is an integration test that spins up a real Postgres via **testcontainers** (needs a Docker daemon), runs the migrations via `migrate()`, and exercises CRUD plus the dashboard projection (recurrence expansion, paid exclusion, running balance, empty state) and migration idempotency. `api/src/index.js` exports the Express `app` and only calls `listen()` when run directly, so tests can import it.
- **Web tests** (`*.test.jsx`, **Vitest** + Testing Library, jsdom via `vitest.config.js` + `src/test/setup.js`): cover the login form and the dashboard empty/populated states. The api client is mocked with `vi.mock`.

Still verify end-to-end changes by running the app (`docker compose up --build`).
