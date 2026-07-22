# Contributing

Thanks for your interest in improving simple-cash-flow!

## Project layout

- `api/` — Express + PostgreSQL backend (raw SQL via `pg`, no ORM).
- `web/` — React + Vite single-page app (Tailwind, Recharts).
- `db/` — schema (`init.sql`) and the optional demo seed.
- `docker-compose.yml` — end-user stack (pulls published images);
  `docker-compose.build.yml` and `docker-compose.dev.yml` are build/dev
  overrides.

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture tour.

## Development setup

Run the full stack from source with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Or run a package directly (database still in Docker — `docker compose up -d db`):

```bash
cd api && npm install && DB_PASSWORD=... AUTH_DISABLED=true npm run dev
cd web && npm install && npm run dev
```

## Checks

Each package has the same scripts. Run them before opening a PR — CI runs the
identical commands:

```bash
# in api/ and in web/
npm run lint          # ESLint
npm run format:check  # Prettier (use `npm run format` to auto-fix)
npm test              # api: node --test (needs Docker for testcontainers)
                      # web: vitest
```

The web package also has `npm run build` (Vite production build), which CI runs.

### Notes on tests

- **API** integration tests use [testcontainers](https://testcontainers.com/),
  which needs a running Docker daemon; they start a throwaway PostgreSQL.
- **Web** tests use Vitest + Testing Library (jsdom).

## Pull requests

- Keep changes focused; update `README.md` / `CLAUDE.md` when behaviour or
  configuration changes.
- Make sure `lint`, `format:check`, and `test` pass in both packages. CI
  (lint + test + docker build) must be green before merge.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
`fix:`, `docs:`, `chore:`, `refactor:`, `test:`, etc. This keeps history
readable and supports automated release notes.
