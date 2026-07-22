# simple-cash-flow

A lightweight, self-hosted cash flow projection app for a small business. Enter
upcoming invoices and bills and get a rolling 13-week cash flow forecast.

Stack: React + Vite (web), Express + PostgreSQL (API/DB), all deployable with
Docker Compose.

## Quick start

Requires Docker and Docker Compose.

```bash
# 1. Create your configuration
cp .env.example .env
# 2. Edit .env — at minimum set POSTGRES_PASSWORD, AUTH_PASSWORD and AUTH_SECRET
# 3. Start everything
docker compose up --build
```

Then open **http://localhost:8080** and sign in with the username/password from
your `.env`.

To explore with sample data, set `DEMO_DATA=true` in `.env` **before** the first
start (it only seeds while the database volume is empty).

## Configuration

All configuration is via environment variables, read from `.env` by Docker
Compose. See [`.env.example`](.env.example) for the annotated list.

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `POSTGRES_PASSWORD` | — | **yes** | Database password. Compose refuses to start without it. |
| `POSTGRES_USER` | `postgres` | no | Database user. |
| `POSTGRES_DB` | `cashflow` | no | Database name. |
| `AUTH_PASSWORD` | — | yes¹ | Login password (plaintext). |
| `AUTH_PASSWORD_HASH` | — | no | bcrypt hash of the password; takes precedence over `AUTH_PASSWORD`. |
| `AUTH_SECRET` | — | yes¹ | Secret used to sign session cookies (use a long random string). |
| `AUTH_USERNAME` | `admin` | no | Login username. |
| `AUTH_DISABLED` | `false` | no | Set `true` to disable auth entirely (trusted LAN only). |
| `DEMO_DATA` | `false` | no | Seed a fictional demo dataset on first DB boot. |
| `WEB_PORT` | `8080` | no | Host port for the web app. |
| `API_PORT` | `3000` | no | Host port for the API — development only (see below). |

¹ Required unless `AUTH_DISABLED=true`. The API fails fast with a clear message
if authentication is enabled but unconfigured.

Generate strong secrets:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # AUTH_SECRET
```

## How it's served

In production the **web** container builds the SPA to static files and serves
them via nginx, reverse-proxying `/api` to the **api** container. Only the web
port is published to the host; the API and database are reachable only on the
internal Docker network.

## Development

Run the stack with hot reloading (Vite dev server + API `--watch`) and the API
exposed on the host:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Or run the services directly on your machine — see
[`CLAUDE.md`](CLAUDE.md) for the non-Docker workflow.

## License

[MIT](LICENSE)
