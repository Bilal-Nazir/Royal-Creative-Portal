# Royal Creative — client/agency portal

A Next.js (App Router) portal for Royal Creative and its clients to run a
website project end to end: brief → proposal → deposit → content → design →
development → launch → handover, plus payments, files, messaging and a
contacts pipeline.

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for the full
architecture (stack, folder structure, data store, stage machine, auth,
payments/storage/email drivers) and
[`docs/DESIGN_NOTES.md`](docs/DESIGN_NOTES.md) for every deliberate
deviation from the Figma file and why. This file is just enough to get the
app running locally.

## Requirements

- Node.js 20+, npm
- MongoDB, running as a (single-node is fine) **replica set** — required for
  transactions. See "Local setup" in `docs/PROJECT_CONTEXT.md` for exact
  conversion steps if your local Mongo is a standalone instance.
- Redis

## Setup

```bash
npm install
cp .env.example .env.local   # fill in AUTH_SECRET, MONGODB_URI, REDIS_URL
npm run db:seed              # wipes MONGODB_URI and loads demo data (asks for confirmation)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Every seeded account
uses the password `password123` — see "Seeded logins" in
`docs/PROJECT_CONTEXT.md` for the list of emails and roles.

## Checks

```bash
npm run lint
npm run typecheck
npm run test     # vitest — REPOSITORY_DRIVER=memory, no live Mongo needed except one skip-if-unreachable suite
npm run build
npx playwright test
```

`npm audit` is expected to report 0 vulnerabilities; re-run it after any
dependency change.

## Payments, storage and email

Bank transfer, local disk, and console-logged email are the defaults —
real S3/R2 storage and SMTP email are opt-in via env vars
(`STORAGE_DRIVER=s3`, `EMAIL_DRIVER=smtp`). See `.env.example` and
`docs/PROJECT_CONTEXT.md`'s "Payments, storage and email" section.
