# Implementation Plan: Women Builders Platform (Revision 2)

> R2 replaces the original plan: it builds in `gap-resolutions.md`. Work goes one step at a time. Each step ends with typecheck, lint, and tests passing, then a commit. `G#` labels refer to `gap-resolutions.md`.

## Step 0: Spec resolution
- [x] 0.1 Review specs and document gaps (`spec-review.md`)
- [x] 0.2 Resolve gaps and record decisions (`gap-resolutions.md`)
- [x] 0.3 Amend `requirements.md` (R2 markers; new Req 21–25)
- [x] 0.4 Mark superseded sections in `design.md`

## Step 1: Foundation
- [x] 1.1 Next.js 14 (App Router) + TypeScript strict + Tailwind + ESLint
- [x] 1.2 Prisma schema (R2): users, sessions, tokens, login attempts, profiles, requests, canonical connections, messages, blocks, reports, dismissals, notification prefs, email outbox, potential members + status history, invitations, audit log
- [x] 1.3 Initial migration + seed (admin with no directory profile, demo members)
- [x] 1.4 Vitest configured with a separate test database
- _Req: foundation; G17_

## Step 2: Authentication and accounts
- [x] 2.1 Email normalization, password policy, bcrypt (G11)
- [x] 2.2 Database sessions with a hashed token cookie; status re-checked every request (G3)
- [x] 2.3 Registration: Profile created at sign-up, verification email, invitation token path, prospect linking (G10)
- [x] 2.4 Login: per-(email, IP) throttle, global backstop, generic errors, timing equalization (G7)
- [x] 2.5 Email verification, password reset, change password (Req 24)
- [x] 2.6 Route gating: pending → `/pending`, onboarding redirect, admin guard (Req 11.5–11.8)
- [x] 2.7 Origin-check middleware for API mutations, CSP nonce, security headers (G4, G18)
- _Req: 11, 18, 24_

## Step 3: Profiles and privacy
- [x] 3.1 Completeness service with the explicit formula and gate (G15)
- [x] 3.2 Profile editor (own profile) with role-specific sections, hidden-field toggles, tag normalization
- [x] 3.3 Onboarding wizard
- [x] 3.4 `toMemberView` privacy DTO used by every read path (G5)
- [x] 3.5 Member profile page with connection-state actions
- _Req: 1, 9, 10, 12_

## Step 4: Discovery
- [x] 4.1 Relevance service (tokenizer, cosine needs/offerings, symmetric role matrix, mutuals) (G13)
- [x] 4.2 Search service with a visibility-aware match and ranking (G14)
- [x] 4.3 Search page with filters and pagination
- [x] 4.4 Recommendations with exclusions, dismiss (upsert, 30 days), explanations from visible fields only
- _Req: 2, 5_

## Step 5: Network, safety, messaging
- [x] 5.1 Connection requests: atomic limits, one pending per pair, crossing auto-accept, silent decline, expiry (G1, G6)
- [x] 5.2 Requests page (incoming/outgoing), connections list with search, remove connection
- [x] 5.3 Block/unblock, report (G9)
- [x] 5.4 Messaging: connection check, limits, read-only states, mark read, 3s polling (G12)
- _Req: 3, 4, 14, 15, 21_

## Step 6: Notifications
- [x] 6.1 Email outbox with retry worker; provider = Resend, or console in dev (G12)
- [x] 6.2 Preferences + signed one-click unsubscribe
- [x] 6.3 Message email coalescing
- _Req: 16_

## Step 7: Admin
- [x] 7.1 Applications queue: approve/reject (+ emails, approvedAt, prospect sync)
- [x] 7.2 Members list: deactivate/reactivate (kills sessions), grant/revoke admin with guards
- [x] 7.3 Potential members: CRUD, dedupe by email + LinkedIn, DNC suppression, assignment, notes, outreach log, status history
- [x] 7.4 Follow-up queue (date-only, timezone-aware)
- [x] 7.5 CSV import: preview + commit, partial, limits, formula neutralization
- [x] 7.6 Invitations
- [x] 7.7 Reports queue
- [x] 7.8 Dashboard: counts, conversion metrics, growth by approvedAt, upcoming follow-ups, date range
- [x] 7.9 Audit log viewer
- _Req: 6, 7, 8, 13, 19, 20, 21.5, 22, 23_

## Step 8: Operations and data rights
- [x] 8.1 Cron routes (outbox, expire requests, archive) protected by `CRON_SECRET`; `vercel.json`
- [x] 8.2 Data export and account deletion (Req 25)
- [x] 8.3 Self-deactivate/reactivate
- [x] 8.4 README: setup, env vars, scripts

## Step 9: Designer handoff
- [ ] 9.1 Self-contained designer handoff: product, users, IA, every screen and state, content, rules, constraints

---

# Revision 3: features taken from the client's reference page

Spec: `specification-r3.md`. Built one step at a time; each step ends with typecheck, lint, tests, a browser check and a commit.

| # | Feature | Where it comes from on the reference page | Spec | Step |
|---|---|---|---|---|
| 1 | Profile photos | Candid photography of members throughout | F6 | 1 |
| 2 | City + country on profiles, country filters | "2,400 members in 31 countries"; city-based dinners | F6, F8 | 1 |
| 3 | Investor fields: firm, investor type, leads/follows, currently investing, last check | Capital Map: "sorted by who actually writes", "verified activity" | F6, F9 | 1 |
| 4 | Founder raise amount | "Raising founders" in The Season; rounds that close | F6, F9 | 1 |
| 5 | "Open to" on profiles (agreed suggestion, supports equal roles) | Operator Rooms, builders | F6, F8 | 1 |
| 6 | Request-an-invitation front door feeding the outreach tracker | "Invite only", "Request an invitation", one-field apply form | F3, F20 | 2 |
| 7 | Requests queue with 3-week answer promise | "You will hear back either way within three weeks" | F21 | 2 |
| 8 | Invitation-only joining | "Invite only, since 2019" | F4 | 2 |
| 9 | Community charter, accepted on joining | "Read the charter" | F2 | 2 |
| 10 | Capital view: investors and founders raising | Capital Map: "640 funds and angels, filtered by stage and thesis" | F9 | 3 |
| 11 | Founder↔investor stage fit in recommendations | Capital Map; "the women who fund them" | F10 | 3 |
| 12 | "Still investing?" check-ins | "Only funds that closed a deal in the last nine months stay on the list" | F9 | 3 |
| 13 | Warm introductions (double opt-in) | "Real introductions", "the shortest warm path from your own contacts" | F12 | 4 |
| 14 | "Prefer introductions" setting | "A network that returns the call" | F11 | 4 |
| 15 | "Ask the team" introductions (agreed suggestion) | "Returns the call" | F12 | 4 |
| 16 | Gatherings: dinners and working sessions | The Table (twelve seats), Operator Rooms | F14, F23 | 5 |
| 17 | "People you met" after a gathering | The Table: founders and check writers meet | F14 | 5 |
| 18 | Real public homepage with live numbers | Hero, stats strip, "four rooms" | F1 | 6 |
| 19 | Upcoming gatherings teaser on the public site | The Table, The Season | F1 | 6 |
| 20 | Visual direction for the designer | Warm editorial look, serif + sans, candid photography | Handoff | 6 |
| 21 | Two-approval review, member reviewers, open / waitlist switch | "Every application is read by two members", "Membership opens twice a year" | F21, F26 | 7 (R2) |
| 22 | Wins | "310 rounds closed through intros", "$1.9B deployed" | F15 | 8 (R2) |
| 23 | Public showcase and quotes (opt-in) | "Some of the table", member testimonial | F16 | 9 (R2) |

Not taken (see spec section 12): paid membership, Deal Flow, The Season program tools, an index of non-member funds, member numbers.

## R3 progress
- [x] Step 1: Profile foundations (features 1–5)
- [x] Step 2: Front door (features 6–9)
  - Public `/request-invite` form: honeypot, 5 per network per hour, 3 per email per day. The visitor sees the same confirmation every time, so the form never reveals who is already known.
  - Admin `/admin/requests` queue: oldest first, overdue after 21 days (red badge in the nav), invite / decline (kind email, can ask again after 90 days) / spam (no email). Weekly overdue digest for admins.
  - Self-registration, email verification and the applications queue are removed. `/join?invite=` creates an active member directly and requires accepting the charter. Legacy pending applicants were migrated into open requests.
  - Invitation reminder after 7 days carries a fresh link, because only token hashes are stored.
  - `/charter` (public), plus a `/charter/accept` interstitial when the version goes up. It offers export, deactivate or delete for members who don't accept. Members get a one-time email per charter version.
- [x] Step 3: Capital (features 10–12)
  - `/capital` has two tabs.
    - **Investors:** "currently investing" is on by default. Filters: "I'm raising checks of $X", stage, sector, type, leads/follows, country. Sort: confirmed in 90 days, then latest check, then relevance, then name.
    - **Founders raising:** filters for stage, industry, country and raise range.
    - Every filter respects hidden fields. A founder who hides her funding status doesn't appear for non-connections.
  - Founder↔investor role fit is 100 only when the founder's stage maps to one of the investor's stages and she is currently investing; otherwise 70.
    - Stage mapping: Idea→Pre-seed, Series C+→Growth; Bootstrapped and Public have none.
    - New reasons: "Investing at your stage" / "Raising at a stage you invest in", "N mutual connections can introduce you", and "Also in <city>" (reason only).
  - "Are you still investing?" check-ins:
    - Home prompt and a daily email, at most once per 90 days. Investors can opt out of the email in Settings.
    - `POST /api/me/investing-status`.
  - The "How to reach her" card action shows Message, View and connect, or Request sent. Introduction actions arrive in Step 4.
- [x] Step 4: Introductions (features 13–15)
  - The flow: A asks B, a mutual connection who allows introduction requests. B introduces or passes. C accepts or says not now.
    - On accept, A and C are connected and the conversation opens with "Introduced by B" and both notes.
    - A and B are emailed when C accepts.
  - Every "no" is silent. Until a step's 14-day deadline passes, A sees the same status whether or not someone declined. After that she sees "No introduction was made".
    - Blocking and account deletion close open introductions the same silent way.
  - Limits: 5 open per member, 1 open per target, 1 per introducer–target per 90 days. Same completeness gate as connection requests. No introduction while a connection request is pending either way.
  - "Prefer introductions" (setting and onboarding step 4): direct requests are refused, and the profile shows "Ask for an introduction". Cards show a "Prefers introductions" tag.
  - "Ask the team": offered only when nobody in her network can introduce her (decision: "no eligible introducer", not just "no mutual connection"), 2 per calendar month.
    - Admin queue at `/admin/introductions` with a nav badge.
    - The team is shown as "The Women Builders team".
  - `/introductions` has three tabs, with a nav badge for items waiting on the member and a Report action.
  - Admin dashboard: introductions made and accepted, with team introductions counted separately.
  - The daily cron expires introductions.
- [x] Step 5: Gatherings (features 16–17)
  - **Member side:** `/gatherings` with Upcoming and My gatherings.
    - Order: her country first, then online, then others. Filters: type, city, online.
    - Detail shows local time, plus "your time" for online sessions. The venue or link appears only once confirmed.
    - Request a seat (curated) or take one (open, with waitlist and automatic promotion). Cancel; within 24 hours it's a late cancellation.
    - "Who's coming": blocked pairs never see each other. `.ics` download.
  - **People you met:** for 30 days after a gathering (no-shows excluded), with one-tap Connect pre-filled "We met at <title>". It works even when she prefers introductions, and the profile offers Connect too.
  - **Admin side:** `/admin/gatherings` list and create/edit form (time zone aware), hosts and invitees picker.
    - Request queue: role mix, blocked-pair conflict flags, no-show history (flag at 2), single and bulk confirm, waitlist, "not this time".
    - Attendance marking, a message to confirmed guests, and cancel with a reason.
  - **Emails:**
    - new gathering near you (opt-out in Settings);
    - invite-only invitation;
    - seat confirmed / waitlisted / declined;
    - changed / cancelled;
    - reminders 2 days before and on the morning of (by the gathering's local calendar; new hourly cron).
  - **Recommendations:** new reason, "Going to the same gathering: <title>".
  - **Account deletion:** frees upcoming seats and host spots. The data export includes seats and introductions.
  - **Implementation note:** Prisma `NOT: { attendance: 'NO_SHOW' }` also drops NULL rows (SQL three-valued logic). Use an explicit `OR [null, ATTENDED]`. Covered by a test.
- [x] Step 6: Public website, home and dashboard, designer brief (features 18–20)
  - **Public homepage:**
    - hero, four equal roles, benefits, how joining works;
    - live numbers, each shown only above its threshold (`PUBLIC_NUMBER_THRESHOLDS`);
    - teaser for gatherings marked public;
    - request form; footer.
  - `/privacy` and `/terms` are marked placeholders.
  - **Member Home:** country prompt, To do, your next gatherings / gatherings near you.
  - **Admin dashboard:** active in 30 days, introductions asked/made/accepted, team introductions, upcoming gatherings, members by country.
  - **Deletion:** frees seats within 7 days, promotes the waitlist, emails admins.
  - **Demo seed:** names and companies that matched the client's mock (Amara Okafor/Ledgerly, Priya Raman/Northlight Ventures) were renamed (Adaeze Nwosu/Paystride, Divya Iyer/Harbor Lane Capital).
  - **Designer handoff rewritten for R3** (`docs/designer-handoff.md`), with 32 new placeholder screenshots in `docs/handoff-screens/`.
- [ ] Step 7 (R2): Review rules and site settings (feature 21)
- [ ] Step 8 (R2): Wins (feature 22)
- [ ] Step 9 (R2): Showcase and quotes (feature 23)
