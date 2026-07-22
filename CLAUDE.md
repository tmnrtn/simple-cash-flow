# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A lightweight cash flow projection app for a small business. It replaces a Supabase + Budibase + Metabase stack with a self-hosted React + Express + PostgreSQL solution deployable via Docker. It shows a rolling 13-week cash flow forecast based on upcoming invoices and bills.

## Running the app

```bash
# Start everything (db, api, web)
docker compose up --build

# Ports (configurable via env vars)
# Web: http://localhost:5173
# API: http://localhost:3000
```

Override ports with `API_PORT` and `WEB_PORT` env vars.

## Local development (without Docker)

```bash
# API
cd api && npm install && npm run dev   # node --watch, restarts on file changes

# Web
cd web && npm install && npm run dev   # Vite dev server on :5173
```

The web dev server proxies `/api` requests to `API_TARGET` (default `http://api:3000`). For local dev without Docker, set `API_TARGET=http://localhost:3000` or rely on the default and run the API separately.

The database runs in Docker even during local dev:
```bash
docker compose up db
```

## Architecture

Three services in `docker-compose.yml`:

- **`db`** — Postgres 16. Schema and seed data initialised from `db/init.sql` on first run (via `docker-entrypoint-initdb.d`). Persistent volume `postgres_data`.
- **`api`** — Express app (`api/src/index.js`). Connects to Postgres via `pg` Pool (`api/src/db.js`). Routes in `api/src/routes/` — one file per resource: `balance`, `categories`, `dashboard`, `projects`, `transactions`.
- **`web`** — React + Vite SPA (`web/src/`). Tailwind CSS + Recharts. `web/src/api.js` is the sole HTTP client (thin wrapper around `fetch`). Pages in `web/src/pages/` map 1-to-1 to nav items and API routes.

## Key design details

**Dashboard query** (`api/src/routes/dashboard.js`): The core business logic lives here as three SQL queries (running balance, receipts by counterparty, payments by category). The 13-week projection starts from the most recent `balance` entry date. A shared `entriesCte` string expands both non-recurring (unpaid only) and monthly-recurring transactions into dated entries within the window using `generate_series`.

**No ORM** — all DB access is raw SQL via `pg.Pool`. Keep new queries consistent with this style.

**API proxy** — Vite proxies `/api/*` to the API service, so the web app makes relative `/api/` calls. No base URL configuration needed in the frontend.

**Database schema** (`db/init.sql`): four tables — `category`, `project`, `balance`, and `transaction`. `transaction` is the central table with `is_income BOOLEAN` (TRUE = invoice/income, FALSE = bill/expense), `counterparty`, `category` FK (expenses only), `project_id` FK, `paid BOOLEAN`, and `recurrence TEXT` (NULL or `'monthly'`). `balance` holds point-in-time snapshots; the latest entry is used as the projection start date.

**Recurrence behaviour**: recurring transactions (`recurrence = 'monthly'`) are always projected forward regardless of `paid` status — the paid toggle is hidden for them in the UI. Non-recurring paid transactions are excluded from the dashboard projection.

## Legacy reference files

`schema.sql` (repo root) is the **old Supabase schema**, kept for context only — it is not runnable and does not reflect the current database (it still has separate `invoice`/`bill` tables, since consolidated into `transaction`). The live schema is `db/init.sql`. `Requirements.md` is the original migration brief describing the Supabase + Budibase + Metabase stack this app replaced.

## Testing and linting

There is no test suite or linter configured — no test/lint scripts exist in either `package.json`. Verify changes by running the app (`docker compose up --build`) and exercising it manually.
