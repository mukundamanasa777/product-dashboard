# Product Dashboard

A Next.js dashboard for scraping semiconductor/board-manufacturer product
listings, reviewing what changed, and keeping a product catalog in sync —
either on demand, on a schedule, or via bulk Excel upload.

## What it does

- **Products** — browse the product catalog, filter by name/supplier/
  manufacturer/status, review pending changes (new / URL changed /
  description changed / expired) and Approve, Reject, or Block them.
  Export the current filtered view to Excel.
- **Instant Triggering** — manually kick off a scan of one or all active
  board manufacturers and watch scan runs progress to completion.
- **Scheduled Triggering** — configure a recurring scan schedule (daily/
  weekly/monthly, any hour/minute, any timezone) that runs automatically.
- **File Upload** — bulk-create products from an Excel file, validated
  row-by-row; failing uploads produce a downloadable error report instead
  of a partial import.

## Architecture — two processes, not one

This app is **not** a single Next.js server. It's two separate always-on
processes that must both be running:

| Process | Command | Responsible for |
|---|---|---|
| **web** | `npm run start` (prod) / `npm run dev` (local) | Serving the dashboard UI and REST API |
| **worker** | `npm run worker` | BullMQ workers that actually scrape, sync, import Excel files, and tick the DB-backed schedule every minute |

If only `web` is deployed, the app will load fine but **scans, scheduled
triggers, and file uploads will silently never process** — nothing will
error, jobs will just sit unprocessed in the queue forever. See
[Deploying](#deploying) below.

Data layer: Postgres via Prisma, BullMQ/Redis for job queues, Clerk for
auth, Mantine for UI, Redux Toolkit + RTK Query for all client-side data
fetching.

### Folder structure

```
app/                  Next.js App Router — pages, layouts, API routes
features/
  scanning/           The scraping engine + triggering a scan
  products/           Product/board-manufacturer/semi-supplier data + sync logic
  import-export/      Excel import and export
  schedule/           The DB-backed recurring scan schedule
  shared/             Cross-cutting utils (e.g. list-route sort parsing)
lib/
  queue/              BullMQ queue/worker definitions, the scheduler
  redux/              The RTK Query API slice + store
prisma/               Schema + migrations
scripts/worker.ts      Entry point for the worker process
```

## Local development

Requirements: Node ≥22.17, a Postgres database, a Redis instance.

```bash
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, Clerk keys
npm install
npx prisma migrate deploy
npm run dev             # terminal 1 — the web app
npm run worker          # terminal 2 — required for scans/uploads/schedule
```

Open [http://localhost:3000](http://localhost:3000).

> `npm run worker` runs via `tsx`, which does **not** hot-reload — restart
> it after any change to `features/`, `lib/queue/`, or `scripts/worker.ts`.

## Deploying

Both processes need to run continuously in production, against the same
Postgres and Redis. A `Dockerfile` (multi-stage, two targets) and
`docker-compose.yml` are included:

```bash
docker build --target web    -t product-dashboard-web    .
docker build --target worker -t product-dashboard-worker .
```

On a platform that supports multiple services from one repo/image (Render,
Railway, Fly.io, ECS, etc.), deploy `web` as the HTTP service and `worker`
as a background worker service, both pointed at the same `DATABASE_URL`/
`REDIS_URL`. Run `npx prisma migrate deploy` once before (or as part of)
the first deploy.

For local end-to-end testing of exactly this two-service setup:

```bash
docker compose up --build
docker compose exec worker npx prisma migrate deploy
```

Required environment variables are listed in `.env.example`.
