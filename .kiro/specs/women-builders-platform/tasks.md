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
- [ ] 8.1 Cron routes (outbox, expire requests, archive) protected by `CRON_SECRET`; `vercel.json`
- [ ] 8.2 Data export and account deletion (Req 25)
- [ ] 8.3 Self-deactivate/reactivate
- [ ] 8.4 README: setup, env vars, scripts

## Step 9: Designer handoff
- [ ] 9.1 Self-contained designer handoff: product, users, IA, every screen and state, content, rules, constraints
