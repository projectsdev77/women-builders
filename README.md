# Women Builders

A curated professional community for women founders, operators, investors and builders. Members find each other by what they do, what they're building, what they need and what they can offer.

- **Specs:** `.kiro/specs/women-builders-platform/`
  - `requirements.md`: the requirements, amended in Revision 2.
  - `design.md`: the original design. Sections marked *SUPERSEDED* are kept for history only.
  - `spec-review.md`: the gaps found in the original specs.
  - `gap-resolutions.md`: how each gap was fixed. It takes precedence over `design.md` where they conflict.
  - `tasks.md`: the build plan.
- **Designer handoff:** `docs/designer-handoff.md`

## Stack

- **App:** Next.js 14 (App Router) and TypeScript.
- **Styling:** Tailwind. The visuals are placeholders until the design is delivered.
- **Data:** Prisma with PostgreSQL.
- **Auth:** database sessions (hashed token in an HttpOnly cookie) with bcrypt.
- **Email:** Resend, sent through a durable outbox. In development, emails print to the console.
- **Tests:** Vitest, running against a real Postgres test database.

## Getting started

Requirements: Node 20 or newer, PostgreSQL 15 or newer.

```bash
cp .env.example .env            # then edit values
npm install
createdb womenbuilders_dev && createdb womenbuilders_test
npm run db:migrate              # apply migrations to the dev DB
npm run db:seed                 # admin + demo members (set SEED_DEMO=0 to skip demo data)
npm run dev                     # http://localhost:3000
```

Seed accounts:

| Account | Email | Password |
|---|---|---|
| Admin | `$ADMIN_EMAIL` | `$ADMIN_INITIAL_PASSWORD` |
| Demo members | `amara@demo.womenbuilders.test`, `priya@…`, `mei@…` and more | `DemoPass123` |

Joining is by invitation only. The seed adds two open invitation requests (Nadia and Chloe) to `/admin/requests`. Without `RESEND_API_KEY`, every email (invitation links, password resets) is printed to the server console. That's how you follow links locally.

Seed users accept the current community charter. Members whose charter version is older see `/charter/accept` on their next visit.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and start |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit and integration tests. The test DB comes from `.env.test`; run `npm run db:test:reset` once to create its schema |
| `npm run db:migrate` | Create or apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed the admin and demo data |

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `APP_URL` | Public origin (e.g. `https://womenbuilders.com`). Used in email links and for the exact-origin CSRF check on API mutations |
| `APP_TIMEZONE` | Timezone for "today" in admin follow-up queues (default `America/New_York`) |
| `APP_SECRET` | Signs one-click unsubscribe links |
| `CRON_SECRET` | Bearer token that the cron routes require |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email delivery (optional in dev) |
| `STORAGE_DRIVER`, `STORAGE_DIR`, `S3_*` | Profile photo storage: local disk by default, or any S3-compatible bucket |
| `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Seed admin |

## Scheduled jobs (`vercel.json`)

| Route | Schedule | Job |
|---|---|---|
| `/api/cron/outbox` | every minute | Send queued emails, with retries and backoff |
| `/api/cron/expire-requests` | daily | Expire connection requests after 30 days |
| `/api/cron/archive` | weekly | Soft-archive closed prospects after 2 years (never do-not-contact records) |
| `/api/cron/daily` | daily 08:00 | Invitation reminders (after 7 days), charter update emails, introduction expiry, investing check-ins |
| `/api/cron/hourly` | hourly | Gathering reminders (2 days before, and from 7:00 local time on the day) |
| `/api/cron/requests-digest` | Mondays 09:00 | Email admins when invitation requests are past the 21-day promise |

Every cron request must include `Authorization: Bearer $CRON_SECRET`. Per-minute crons need a Vercel Pro plan. On other hosts, call the routes from any scheduler.

## Code map

```
app/(auth)/        login, request-invite, join (invitation only), forgot/reset password
app/charter/       public charter + /charter/accept interstitial
app/onboarding/    4-step profile wizard
app/(member)/      dashboard, search, recommendations, members/[id], connections, messages, profile, settings
app/(admin)/admin/ dashboard, requests, members, prospects (+import), follow-ups, invitations, reports, audit
app/api/           REST API (see docs/designer-handoff.md, "API surface")
lib/services/      business rules (one module per domain; the gap IDs G1–G18 are referenced in comments)
lib/auth/          sessions, guards, login throttling
lib/email/         templates + outbox
prisma/            schema, migrations, seed
tests/             Vitest suites (auth, profiles, discovery, network, notifications, admin, data rights)
```
