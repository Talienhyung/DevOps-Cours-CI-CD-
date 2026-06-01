# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A teaching project ("TrainShop Starter") for a DevOps CI/CD course. It is a small but complete 3-tier app (static frontend → Express API → PostgreSQL). README, docs and code comments are in French.

The exercise instructions and reference solution live in `docs/`:
- `docs/TP-ETUDIANTS.md`, `docs/TP-CI-CD-A-FAIRE.md` — student assignment
- `docs/CORRECTION-CI-CD.md` — instructor correction
- `docs/REPONSES-TP.md` — completed answers for this repo's TP

## Architecture

```
frontend (nginx, port 8081→80)  →  api (Express, port 3000)  →  db (postgres:16, 5432)
```

- **api/** — Express app split so it is testable without a server or DB:
  - `src/app.js` exports the Express `app` (routes: `/`, `/about`, `/health`, `/products`, `/products/:id`, `POST /products`). Tests import this directly.
  - `src/db.js` exports a single shared `pg` Pool built from `DATABASE_URL`. Tests `jest.mock('../src/db')` to avoid a real database.
  - `src/server.js` loads dotenv and calls `app.listen` — the only entrypoint that touches the network/env.
- **frontend/** — plain HTML/CSS/JS served by nginx; `src/app.js` fetches the API at a **hardcoded** `http://localhost:3000`, so the browser talks to the API directly (not proxied through nginx).
- **database/init/001-init.sql** — runs automatically on first DB boot via the postgres image's `docker-entrypoint-initdb.d`. It creates the `products` table and seeds it. Schema changes here only take effect on a fresh volume (`docker compose down -v`).

## Commands

Run the full stack (requires `.env` — `cp .env.example .env` first):
```bash
docker compose up -d --build
docker compose ps
docker compose down       # stop;  add -v to also wipe the DB volume
```

API development (from `api/`):
```bash
npm install
npm test                          # jest --runInBand
npm test -- about.test.js         # single test file
npm test -- -t "should return API status"   # single test by name
npm run dev                       # node --watch src/server.js
```

Note: `npm run lint` is a placeholder (`echo "Lint OK"`), not a real linter.

## CI/CD

Two GitHub Actions workflows under `.github/workflows/`:
- `ci.yml` — on push/PR to `main`: job `test-api` (Node 20, `npm install`, `npm test`) then `docker-build` (builds API + frontend images). The Node cache uses `api/package-lock.json`, so that lockfile must stay committed.
- `docker-publish.yml` — bonus: builds and pushes images to Docker Hub. Requires repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

## Conventions

- Tests mock `src/db`; never assume a live Postgres in unit tests.
- The frontend API URL is hardcoded — changing the API port means editing both `frontend/src/app.js` and `docker-compose.yml`.
