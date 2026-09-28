# Gap Resolutions (Spec Revision 2)

This document records how every gap in `spec-review.md` was resolved. Each entry covers three things:

- **Decision:** what the spec now says.
- **Spec change:** where `requirements.md`, `design.md`, or `tasks.md` changed.
- **Implemented in:** the code that enforces it.

Where this document and the original `design.md` disagree, **this document wins**. `design.md` carries "SUPERSEDED (R2)" markers at the affected sections.

Status legend: ✅ resolved and implemented · 📐 resolved in spec only (decision recorded, deliberately deferred) · ⏭️ descoped to Phase 2.

---

## P0 fixes

### G1: Rate limiting never limited anything ✅
- **Decision:** don't use a `RateLimit` table. Limits are counted directly from the rows that matter: `ConnectionRequest.createdAt` and `Message.createdAt` in the trailing 24 hours ("per day" = rolling 24h).
  - Check and insert run in one transaction.
  - The transaction takes a per-user `pg_advisory_xact_lock`, so parallel requests serialize and can't race past the limit.
- **Limits:**
  - 20 connection requests per rolling 24h.
  - 200 messages per rolling 24h. Raised from 50: 50 across *all* conversations throttled ordinary active members, and harassment is now handled by block/report (G9).
  - A per-conversation cap of 20 messages to a recipient who hasn't replied yet.
- **Spec change:** Req 3.7, 4.6 (new); design §Rate Limiting superseded.
- **Implemented in:** `lib/services/rate-limit.ts`, `lib/services/connections.ts`, `lib/services/messaging.ts`.

### G2: IDOR on accept/decline/cancel/markAsRead/profile update ✅
- **Decision:** every mutating service function takes `actorId` from the server-side session, never from the request body or URL. Each one asserts the right relationship:
  - **accept/decline:** actor must be the request's receiver.
  - **cancel:** actor must be the sender.
  - **mark read:** actor must be the receiver. This is a conversation-level operation: "mark all messages from X to me read".
  - **profile update:** only `/api/me/profile` exists; there is no `PATCH /api/members/:id`.
  - A failing check returns 404, not 403, so the endpoint doesn't reveal that the resource exists.
- **Spec change:** new Req 11.7; API table rewritten in design R2.
- **Implemented in:** `lib/services/*`, `app/api/**`.

### G3: Stale JWT kept deactivated users and demoted admins in ✅
- **Decision:** NextAuth JWT sessions are replaced with **database sessions**.
  - The session is a random 256-bit token in an `HttpOnly; Secure; SameSite=Lax` cookie. Only its SHA-256 hash is stored in the `Session` table.
  - Every request loads the session *joined with the user*, so status and admin flag are always current.
  - Deactivating a user, or changing their admin flag, deletes all their sessions immediately.
- **Why not NextAuth:** its Credentials provider can't use database sessions, and credentials are the only login method in scope.
- **Spec change:** tech stack updated; Req 11.8 (new).
- **Implemented in:** `lib/auth/session.ts`.

### G4: CSRF origin check bypass ✅
- **Decision:** for any non-GET `/api/*` request, `middleware.ts` requires an `Origin` header (falling back to `Referer`). Its origin must **exactly equal** `APP_URL`'s origin. A missing header means 403. This backs up the session cookie's `SameSite=Lax`.
- **Implemented in:** `middleware.ts`, `lib/security/origin.ts`.

### G5: Hidden fields leaked via search, filters, and recommendations ✅
- **Decision:**
  - **Allow-list.** Only these fields can be hidden: `location`, `professionalBackground`, `currentFocus`, `needs`, `offerings`, `companyName`, `fundingStatus`, `checkSize`, `linkedInUrl`, `websiteUrl`.
  - **Always visible:** name, roles, headline, and expertise, because they are the minimum needed for discovery.
  - **Email** is never shown to other members.
- **One DTO builder for all output.** `toMemberView(profile, viewer)` is the only way profile data leaves the server. It is used by profile view, search results, recommendations, and connection lists.
- **Search respects visibility.**
  - Text search only matches fields the viewer can see.
  - Filtering on a field (e.g. location) excludes members who hid that field from this viewer, so the filter can't be used as an oracle.
- **Recommendation explanations** are built only from fields visible to the viewer.
- **Req 9.2/9.3 contradiction:** hidden fields ARE visible to connections.
- **Spec change:** Req 9.2, 9.3, 9.6 (new).
- **Implemented in:** `lib/services/privacy.ts`.

### G6: Request uniqueness blocked re-requests, leaked declines, and allowed duplicate connections ✅
- **Decision:**
  - **Canonical connection pairs.** `Connection` stores `userAId < userBId`, unique on the pair, so one pair means one row.
  - **No DB unique on `ConnectionRequest(sender, receiver)`.** Instead, "at most one PENDING request per pair (either direction)" is enforced in a transaction with a pair advisory lock.
  - **Crossing requests auto-connect.** If B sends to A while A→B is pending, A's request is accepted: both clearly want to connect.
  - **Declines are silent.**
    - A declined request keeps appearing to the **sender** as "pending" until its original 30-day `expiresAt`.
    - After that, the sender sees "none" and may request again.
    - The receiver sees nothing.
    - The sender never gets an error that reveals the decline.
  - **Dismissals upsert,** so dismissing the same person again after the cooldown doesn't fail.
- **Spec change:** Req 3.6 reworded, 3.8/3.9 (new).
- **Implemented in:** `lib/services/connections.ts`, `lib/services/recommendations.ts`.

### G7: Anyone could lock anyone out, and login enabled user enumeration ✅
- **Decision:**
  - **Failed logins are tracked per (email, IP)** in `LoginAttempt`: 5 failures in 15 minutes blocks that IP from that account for 15 minutes. An attacker elsewhere can't lock the real owner out.
  - **Global backstop:** 50 failures per account per hour from any IPs triggers a 15-minute lock plus a "suspicious activity" email.
  - **A password reset** clears locks.
  - **Every failure returns the same generic message:** "Email or password is incorrect". The one exception, a PENDING account, is shown only *after* a correct password.
  - **Timing is equalized** by always running bcrypt, using a dummy hash when the user doesn't exist.
- **Spec change:** Req 11.3 rewritten, 11.9 (new).
- **Implemented in:** `lib/auth/login.ts`.

### G8: DNC suppression was deleted by retention ✅
- **Decision:**
  - **Archiving never deletes.** It sets `archivedAt` and hides the record from default lists.
  - **`DO_NOT_CONTACT` records are never archived**, and are exempt from retention.
  - **Suppression is enforced everywhere.** Manual create, CSV import, and invitations all refuse a DO_NOT_CONTACT email or LinkedIn URL, including archived records.
- **Spec change:** Req 6.6 (new); retention decision rewritten.
- **Implemented in:** `lib/services/potential-members.ts`, `lib/jobs/archive.ts`.

---

## P1 fixes

### G9: Trust & safety absent ✅
New **Requirement 21**:
- **Block:** hides both members from each other everywhere (search, recommendations, and profile view, which returns 404). It removes any connection, cancels pending requests, and blocks messaging. It's silent to the blocked person.
- **Report:** a member can report a member (and optionally a message) with a reason category and details. Reports go to an admin queue with statuses OPEN / RESOLVED / DISMISSED.
- **Remove connection:** a soft delete (`removedAt`). History is kept for both members but read-only. Reconnecting takes a new request.
- **Deactivated or pending members:**
  - They're invisible in search, recommendations, and profile view.
  - Existing conversations become read-only, with a "no longer active" banner.

**Implemented in:** `lib/services/safety.ts`, `app/(member)/…`, `app/(admin)/admin/reports`.

### G10: Membership lifecycle ✅
- **Account states:** `PENDING` (applied), `ACTIVE`, `REJECTED`, `DEACTIVATED`. The deactivation records who did it: `SELF` or `ADMIN`.
- **Email verification** is required before an application shows up in the admin queue. It uses a single-use token that expires in 24h.
- **Rejection:**
  - Admins can reject with an optional internal note. Applicants receive a neutral email.
  - A rejected email may re-apply after 90 days: the old user row is recycled.
- **Invitations:**
  - An admin can invite a potential member (or any email).
  - Inviting creates an `Invitation` with a single-use hashed token that expires in 14 days, and sends an email. This is a transactional platform email, not outreach tracking.
  - Registering with a valid token skips the approval queue: the account becomes `ACTIVE` once email verification is implied by the token.
- **Linking prospects to accounts:**
  - On registration, a `PotentialMember` with the same (normalized) email is linked via `userId` and moved to `APPLIED`.
  - On approval it moves to `APPROVED`.
  - All status changes are written to `PotentialMemberStatusChange`.
- **PENDING users** can log in, but only see a "Your application is under review" page. Every API except `/api/me` and `/api/auth/*` returns 403 `ACCOUNT_NOT_ACTIVE`.
- **Eligibility.** Application criteria are a **policy** decision, not code. The application form asks "Tell us about what you're building" plus a self-identification statement: "Women Builders is a community for women and non-binary builders." Admins decide. Criteria text is configurable in `lib/config.ts`.
- **Admin management:**
  - Admins can promote or demote other admins. They can't demote themselves or the last admin.
  - All admin actions are written to `AuditLog`.
  - Admins without a member profile are not in the directory.
- **Spec change:** Req 18 rewritten; new Req 22 (Invitations), 23 (Admin management & audit).

### G11: Account basics ✅
- **Emails** are normalized with `trim().toLowerCase()` at every entry point, and stored normalized.
- **Password reset:**
  - Single-use hashed token, expiring in 1h.
  - The response is always generic ("If an account exists, we've sent a link").
  - A successful reset kills all sessions and clears login locks.
- **Change password** requires the current password and kills other sessions.
- **Self-deactivation** is available in Settings.
  - A self-deactivated member who logs in with the correct password is offered "Reactivate my account".
  - An admin-deactivated member is told to contact the admins.
- **GDPR:**
  - `GET /api/me/export` returns a JSON file of all the member's data.
  - `DELETE /api/me` permanently deletes the account after password confirmation. Messages the member sent are deleted. Counterpart conversations show "Deleted member".
- **Prospect data:** a `lawfulBasisNote` field plus the policy that records are only created from professional/public context. The retention rules in G8 apply.
- **Spec change:** new Req 24 (Account security), 25 (Data rights).

### G12: Real-time messaging mechanism and email storms ✅
- **Decision:**
  - **Delivery:** the conversation view polls every 3s while visible, and the unread badge polls every 30s. That meets the 5s target on serverless hosting without WebSockets. Push/SSE is Phase 2.
  - **Email outbox:** emails are written to an `EmailOutbox` table in the same transaction as the event. A worker (`/api/cron/outbox`, every minute) sends them with retries: 5 attempts with exponential backoff. The request handler also kicks the worker once. The user request never fails because the email provider is down.
  - **Message emails are coalesced:** at most one "new messages from X" email per conversation per 30 minutes, and none if the recipient has already read them.
  - **Message length:** max 5,000 characters.
- **Spec change:** Req 4.2, 16.1–16.3 clarified; 16.6/16.7 (new).
- **Implemented in:** `lib/email/outbox.ts`, `lib/services/messaging.ts`.

### G13: Recommendations ✅
- **Req 5.2 is now "up to 20".** If fewer than 5 eligible members exist, show them all plus an empty-state prompt to complete your profile or search.
- **`lastActive`** is updated on authenticated requests, throttled to once per 5 minutes.
- **Tokenizer:**
  - Keeps tokens of 2+ characters, so "AI", "ML", "VC", "PR" survive.
  - A domain allow-list keeps key acronyms.
  - A stop-word list removes filler.
  - A light suffix stemmer handles "ing/ed/es/s", so "fundraising" matches "fundraise".
- **Needs↔offerings score** uses cosine similarity on binary token sets: `|N∩O| / sqrt(|N|·|O|)`. Keyword-stuffing a huge offerings list now *lowers* the score.
- **Role matching** is symmetric and considers **all** roles on both sides (primary + secondary). The complementarity matrix is in `lib/services/relevance.ts`.
- **Expertise tags** are normalized (lowercase, spaces/underscores → hyphens) on save and on compare.
- **`mutual_connection`** is computed.
- **Computed on request** with a candidate cap of 2,000 most recently active members. Stored/cached recommendations are Phase 2. At ≤10k members this meets the SLA.
- **Excluded from results:** self, blocked, connected, pending-request, dismissed-within-30-days, and inactive members.
- **The design's broken unit test** was replaced with tests matching the documented formula.

### G14: Search ignored the query ✅
- **With a text query,** name matches (exact, prefix, or every query word starting a name word) form a top tier. Within a tier, results are ranked `0.6·textMatch + 0.25·relevance + 0.15·completeness`.
- **Without a query,** ranking is `0.7·relevance + 0.3·completeness`, as originally designed.
- **Short names** (Ana, Li) match via name-prefix matching. They aren't dropped.
- **SQL prefilter:** `ILIKE` over visible text columns plus exact expertise tags. Then visibility-aware scoring in the service, then pagination. The candidate cap of 2,000 is documented. Postgres FTS/Algolia is Phase 2.

### G15: Profile completeness undefined ✅
- **Formula:** `score = round(100 × filled / applicable)`.
  - **Applicable fields** = 7 core fields (headline, professionalBackground, expertiseAreas ≥1, currentFocus, needs, offerings, location) plus the role-specific fields for **each** role the member holds (primary and secondary).
- **Connection requests unlock** when `score ≥ 60` **and** the primary role's required fields are filled:
  - Founder: companyName, companyStage
  - Operator: functionalExpertise, seniorityLevel
  - Investor: investmentStages, checkSizeMin/Max
  - Builder: technicalSkills
- **The score is recomputed on every save,** so no nightly job is needed.
- **A Profile row is created at registration** (primary role + headline), so search and recommendations never see a user without one.

### G16: Admin/outreach gaps ✅
- **PotentialMember email is optional.** A record needs at least one of email / LinkedIn URL. Dedupe checks both, normalized. LinkedIn URLs are canonicalized to `https://www.linkedin.com/in/<slug>`.
- **`assignedAdminId`** gives each prospect an owner. The list can filter by "Assigned to me".
- **Every status change** goes through one function that writes `PotentialMemberStatusChange(from, to, at, by)`, including the `PATCH` endpoint.
- **Conversion metrics** = for each status S, the number of prospects who entered S in the range, and how many later reached APPROVED. No "next status" assumption.
- **`approvedAt`** is on `User`. Member growth is by `approvedAt` month.
- **Follow-up dates are date-only** (`@db.Date`). "Today" is computed in `APP_TIMEZONE` (default `America/New_York`). The queue excludes archived records and statuses APPROVED / NOT_INTERESTED / NOT_A_FIT / DO_NOT_CONTACT. It's sorted with overdue first.
- **CSV import:**
  - **Two steps:** a **preview** (dry run, returns per-row results) then a **commit**.
  - **Partial import:** valid rows import, invalid rows are reported.
  - **Checks:** duplicates within the file, and duplicates against existing prospects and members.
  - **Limits:** 1 MB / 2,000 rows max. Uploaded as multipart, not as a JSON string.
  - **Header matching** is case-insensitive.
  - **Role** is mapped case-insensitively to the four roles; unknown values are stored as free text.
  - **Formula injection:** cells starting with `= + - @` are prefixed with `'` on storage.

### G17: Document contradictions ✅
| Topic | Resolution |
|---|---|
| Test framework | **Vitest** everywhere |
| Tests optional | Core service tests are **required**; only E2E is optional |
| Checkpoints | Each step runs typecheck + lint + unit tests before commit |
| Archival schedule | Weekly (Sunday 02:00 UTC) |
| Archive vs delete | Archive = soft (`archivedAt`); never delete; DNC exempt |
| Post-login route | ACTIVE with incomplete profile → `/onboarding`; else `/dashboard`; PENDING → `/pending` |
| Sessions | DB sessions (see G3) |
| NextAuth | Removed (see G3) |
| Req 9.2 vs 9.3 | Hidden fields visible to connections |
| Req 3.6 | Decline is fully silent (see G6) |
| Task waves | Completeness service moved before onboarding |
| Upstash | Removed. Auth throttling is DB-based (G7). General per-IP limiting is left to the host's WAF |
| Profile images / Blob | ⏭️ Phase 2. Initials avatars in MVP |

### G18: Validation rejected valid input ✅
- **LinkedIn URLs:** any `http(s)://(www.|xx.)linkedin.com/in/<slug>` is accepted and canonicalized.
- **`linkedInUrl` and `websiteUrl`** were added to Profile.
- **Logger:** context is passed per call (`log.child({requestId})`), with no shared mutable singleton.
- **CSP:** nonce-based `script-src` (no `unsafe-eval`, no `unsafe-inline` for scripts in production).
- **Admin notes** render as plain text. No `dangerouslySetInnerHTML` anywhere.
- **Req 17.4:** server errors are logged with a request ID. The user sees the friendly message plus the request ID. There's no admin log viewer; hosting logs/Sentry are the tool.

---

## P2 clarifications (📐 spec decisions)
- **SLAs** are p95 at 10k active members, measured server-side.
- **"Per day"** means rolling 24h.
- **Roles:** exactly one Primary_Role. Secondary roles exclude the primary.
- **Location** is free text (city, country). Filtering is case-insensitive substring.
- **Email footers:**
  - Every notification email has a one-click unsubscribe link for that type: a signed token, `List-Unsubscribe` header.
  - Security/account emails (verification, reset, welcome, rejection, deactivation) are not optional.
- **The connection-request message** is optional (0–500 characters).
- **Deactivated members' data** is kept until the member deletes it (G11). Messages are kept for the counterpart.
- **Scale claim** of 10k members is conditional on the candidate caps above.
