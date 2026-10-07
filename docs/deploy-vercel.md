# Deploying Women Builders on Vercel

Everything the code needs is already in the repo. This page lists **only what you have to do by hand**, in order. Allow about an hour for the first deploy.

## 0. Decisions before you start

| Decision | Recommendation |
|---|---|
| **Vercel plan** | **Pro.** `vercel.json` has a cron that runs every minute (it sends queued emails). Vercel's free Hobby plan only allows daily crons, and a deploy with a faster cron is rejected. |
| **Database** | Neon Postgres, added from the Vercel Marketplace (step 2). Any Postgres 15+ works. |
| **First URL** | Use the free `https://<project>.vercel.app` address while testing. Add your own domain later (step 9). |
| **Email while testing** | Leave `RESEND_API_KEY` **empty** at first. Emails are then written to the database outbox and the logs instead of being sent, so the automated tests can run against the site without emailing anyone. Switch real email on in step 8. |

## 1. Put the code where Vercel can see it

The work is on branch `claude/spec-review-gaps-9fg743` of `projectsdev77/women-builders`. Either:

- merge it into your default branch (open a pull request, or ask Claude to open one), **or**
- in Vercel, set that branch as the **Production Branch** (Project → Settings → Git).

## 2. Create the project and the database

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo. Framework: Next.js (auto-detected). Leave the build command alone: the repo's `vercel-build` script generates the Prisma client, **applies database migrations**, then builds.
2. Before the first deploy, open the project → **Storage → Create Database → Neon (Postgres)** → connect it to the project. Vercel adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` for you. The build uses the unpooled one for migrations.
3. Edit the `DATABASE_URL` value in **Settings → Environment Variables** and add `&pgbouncer=true&connect_timeout=15` to the end of it (Neon's pooled connection needs this for Prisma).
4. **Settings → Functions → Function Region**: pick the region closest to your Neon database (for example both in `iad1`).

## 3. Photo storage (Vercel Blob)

Project → **Storage → Create → Blob** → choose **Private** access → connect to the project. Vercel adds `BLOB_READ_WRITE_TOKEN`. The app detects it and stores profile photos there (never public; every photo is served through the app's own access-checked route). No other setting is needed.

Photos are limited to **4 MB** because Vercel rejects request bodies over 4.5 MB.

## 4. Environment variables

**Settings → Environment Variables**, scope **Production** (and Preview if you use previews; see the note below):

| Name | Value |
|---|---|
| `APP_URL` | The exact public origin with no trailing slash, e.g. `https://women-builders.vercel.app`. Used in email links **and for the origin check that blocks cross-site requests**. If it is wrong, every form fails. |
| `APP_SECRET` | A random string: `openssl rand -base64 32` |
| `CRON_SECRET` | Another random string. Vercel sends it automatically as `Authorization: Bearer …` on each cron call. |
| `APP_TIMEZONE` | e.g. `Africa/Lagos` (used for "today" in the admin follow-up queue) |
| `EMAIL_FROM` | `Women Builders <hello@yourdomain.com>` (can stay a placeholder until step 8) |
| `RESEND_API_KEY` | Leave empty for now (step 8) |

> **Preview deployments** get a different URL on every push, so they fail the `APP_URL` origin check. Test on the **Production** deployment only.

## 5. First deploy

Click **Deploy** (or push). In the build log you should see `prisma migrate deploy` apply the migrations, then `next build` succeed. Open the site: the homepage loads, but nobody can log in yet because the database is empty.

## 6. Create the admin (and demo members for testing)

Run once from your laptop with the repo checked out and `npm install` done. Use the **unpooled** connection string from the Neon integration:

```bash
DATABASE_URL="<DATABASE_URL_UNPOOLED value>" \
ADMIN_EMAIL="you@yourdomain.com" \
ADMIN_INITIAL_PASSWORD="<a strong password>" \
SEED_DEMO=1 \
npx tsx prisma/seed.ts
```

- `SEED_DEMO=1` also creates 13 demo members (`adaeze@demo.womenbuilders.test`, password `DemoPass123`) that the automated tests and your manual testing use.
- **Before real members arrive, use a fresh empty database** (a new Neon branch or database, run the seed again with `SEED_DEMO=0`) so no demo accounts with a known password exist.

## 7. Check the deploy, then run the automated tests against it

1. **Settings → Cron Jobs** should list 6 jobs. Click **Run** on `/api/cron/outbox`; it should return success.
2. From your laptop:

```bash
npm install
E2E_BASE_URL="https://<your-project>.vercel.app" \
DATABASE_URL="<DATABASE_URL_UNPOOLED value>" \
CRON_SECRET="<same as in Vercel>" \
E2E_ADMIN_EMAIL="you@yourdomain.com" \
E2E_ADMIN_PASSWORD="<the admin password from step 6>" \
npm run e2e
```

The suite runs on desktop and phone sizes (about 3 minutes). `DATABASE_URL` is used only to read invitation emails from the outbox so the test can follow the invite link. A report is written to `e2e-report/` (`npx playwright show-report e2e-report`).

## 8. Turn on real email (Resend)

1. Create a Resend account → **Domains → Add Domain** → add the DNS records it shows (SPF, DKIM, and a DMARC record) at your domain registrar. Wait for **Verified**.
2. **API Keys → Create** → copy the key.
3. In Vercel set `RESEND_API_KEY` and `EMAIL_FROM` (an address on the verified domain) → **Redeploy**.
4. Until the domain is verified, Resend only delivers to your own account email.

Do this **after** the automated tests (step 7), because the tests create demo-looking invitations and a gathering announcement.

## 9. Your own domain

Vercel → **Settings → Domains → Add** → create the DNS record it asks for. When it shows as valid, change `APP_URL` to the new origin and redeploy. Update the Resend domain and `EMAIL_FROM` if they differ.

## 10. Before launch

- Replace the placeholder text in `app/privacy/page.tsx`, `app/terms/page.tsx` and `content/charter.ts` with your approved legal and charter text. Bump `CHARTER_VERSION` if the charter's meaning changes (members re-accept it).
- Use a fresh database (step 6 note), a strong admin password, and delete any test accounts.
- Neon: confirm point-in-time restore is available on your plan.
- Vercel: **Settings → Deployment Protection**: keep production public; protect previews if you use them.
