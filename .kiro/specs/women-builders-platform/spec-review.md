# Spec Review: Gaps, Contradictions, and Breakages

> **Status:** all findings below are resolved. See `gap-resolutions.md` (G1–G18) for the decision on each one and where it is implemented.

Review of `requirements.md`, `design.md`, and `tasks.md`. Findings are ranked by severity:

- **P0**: Security hole or a feature that won't work as designed.
- **P1**: Missing requirement or contradiction that will cause rework.
- **P2**: Ambiguity or quality issue.

Each finding gives a concrete scenario showing how it breaks.

---

## P0: Broken or insecure as designed

### 1. Rate limiting never limits anything (design §Rate Limiting)
`windowStart = new Date(Date.now() - 24h)` has millisecond precision, so it is different on every call. As a result:
- `checkRateLimit` upserts a **new** row with `count: 0` every call, so `allowed` is always `true`.
- `incrementRateLimit` computes yet another `windowStart`, so it creates another new row with `count: 1`.
- The cleanup `deleteMany(windowStart < now-24h)` then deletes every earlier row, because each row's `windowStart` is already older than the next call's cutoff.

**Break:** a spammer sends 1,000 connection requests per day. The 20/day and 50/day limits never trigger. The integration test "21st request returns 429" would fail.

Separately, check-then-increment isn't atomic, so parallel requests race past the limit even after the window bug is fixed.

**Fix:** use fixed buckets (e.g. UTC day) or count rows from `ConnectionRequest`/`Message` created in the last 24h. Do the check and the write inside one transaction.

### 2. Anyone can accept, decline, or cancel anyone's request, or mark anyone's message read (IDOR)
`acceptRequest(requestId)`, `declineRequest(requestId)`, `cancelRequest(requestId)`, and `markAsRead(messageId)` take no actor. No ownership check is specified anywhere, in design or tasks. `PATCH /api/members/:id` ("update own profile") also has no rule saying `:id` must equal the session user.

**Break:** Member C enumerates request IDs and accepts a request A sent to B. This creates an A–B connection and opens messaging that B never agreed to. For a women's safety-sensitive community, this is the worst class of bug.

**Fix:** every mutation takes `actorId` from the session and asserts receiver, sender, or owner as appropriate. List this explicitly in requirements.

### 3. Deactivation and admin revocation don't take effect (JWT staleness)
`isAdmin` and `accountStatus` are baked into the JWT at login and never re-read. `requireActiveAccount()` and `requireAdmin()` trust the token.

**Break:** an admin deactivates a harassing member. That member keeps full access (search, messaging) until the JWT expires, which is 30 days by default in NextAuth. A demoted admin keeps admin access the same way.

**Fix:** re-check status from the DB on each request (or use database sessions), or keep a short-lived token plus a revocation check.

### 4. The CSRF origin check can be bypassed
`if (origin && !origin.includes(host))`:
- `https://womenbuilders.com.evil.io` *includes* `womenbuilders.com`, so it passes.
- A request with no `Origin` header also passes.

**Fix:** require `Origin` (or `Referer`) on mutations and compare it exactly to an allow-list.

### 5. Hidden profile fields leak through other channels
`filterProfileFields` only applies to `GET /api/members/:id`. Hidden data still leaks through:
- **Search:** `MemberListItem` always returns `expertiseAreas` and `location`, even when they're hidden. Text search and filters also match on hidden fields. For example, filtering `location=Austin` reveals a member who hid her location.
- **Recommendations:** explanations are generated from `needs` and `offerings`, so hidden needs are quoted back to strangers.
- **Unhideable fields:** `name` and `email` live on `User`, so they can't be hidden. The spec never says whether email is shown to members at all.
- **No field allow-list:** `hiddenFields` accepts arbitrary strings, and the filter returns the raw row (`userId`, `hiddenFields`, `completenessScore`, `lastActive`) unless a DTO is enforced.

### 6. Connection-request uniqueness breaks re-requesting and allows duplicate connections
- `@@unique([senderId, receiverId])` on `ConnectionRequest` means that after a request is DECLINED, CANCELLED, or EXPIRED, the sender can **never** request again. They get a 409 "Resource already exists" error, which also tells them they were declined.
- The reverse direction isn't checked. A→B and B→A can both be pending. If both are accepted, `Connection @@unique([user1Id, user2Id])` doesn't stop (A,B) and (B,A) from coexisting unless IDs are stored in a canonical order, and that isn't specified. The result is two conversations and a split message history.
- The same problem hits `DismissedRecommendation @@unique([userId, dismissedUserId])`: dismissing the same person again after 30 days throws P2002 unless the code upserts.

### 7. Anyone can lock any member's account (lockout DoS)
Five bad passwords for someone's email locks her out for 15 minutes, repeatable forever. There's no per-IP throttling on login specifically, no CAPTCHA, and no unlock email.

Separately, login responses differ between "no such user" (`null`), "locked" (throws), and "deactivated" (throws). This enables user enumeration, which lets an attacker test whether a given woman is a member.

### 8. Do_Not_Contact records are deleted after 2 years, which removes the suppression
`archiveOldPotentialMembers` calls `deleteMany` (the comment says "archive", but the code deletes). Once a DO_NOT_CONTACT record is gone:
- The email passes dedupe (Req 6.4 / 19.3).
- The next CSV import re-adds the person.
- An admin contacts them again.

That's a reputational and legal (CAN-SPAM/GDPR) problem. DNC must be retained indefinitely, at least as a hashed suppression list.

---

## P1: Missing requirements and contradictions

### Membership lifecycle has holes
- **No rejection path.** The UX flow shows "Reject Application", but there's no `REJECTED` status, no endpoint, no email, and no task. Rejected or ignored applicants sit in PENDING forever, and their email is reserved forever.
- **"Invitation validation" (Req 18.3) has no design.** There's no Invitation model, token, or expiry, and no "accept invite / set password" flow.
- **Contradictory conversion flow.** UX flow 4 says APPROVED potential member → "Create User Account → Send Invitation Email". But the key design decisions say the platform does **not** send outreach emails, and no task implements account creation.
- **PotentialMember and User are never linked.** There's no FK, and registration doesn't look up PotentialMember by email. APPLIED and APPROVED statuses are never set automatically, so the funnel (Req 20.2) can't be measured end to end.
- **PENDING users can log in.** `authorize` only blocks DEACTIVATED. What a pending user sees after login is unspecified. The E2E test expects "pending approval", but tasks redirect to onboarding.
- **Who decides who counts as "women builders"?** Eligibility and approval criteria were open question 3. The design marked it "CONFIRMED" without answering. Allies, male investors, and non-binary members are all unaddressed.
- **No admin management.** There's no way to create, promote, or demote admins beyond the seed user, and no audit log of admin actions. `createdBy` is a plain string, not a foreign key.
- **Admins appear in member search.** The seed admin has an OPERATOR profile, so it shows up in search and recommendations.

### Trust & safety is absent
A community for women has no:
- **Block**, **report**, or **remove connection** feature.
- Moderation queue.
- Rules for what happens to messages and connections when a member is deactivated. Today a member can still message a deactivated connection, and nothing says deactivated or pending members are excluded from search, recommendations, or profile view.

This is the biggest product gap.

### Account basics missing from requirements and tasks
- **No email verification.** Anyone can register as `someone-else@company.com`.
- **Password reset** has an endpoint (`/api/auth/reset-password`) but no requirement, token model, email template, or task.
- **No change of email or password.**
- **Case-sensitive emails.** `email @unique` is case-sensitive in Postgres, so `Jane@X.com` and `jane@x.com` become two accounts and two potential-member records, which also defeats dedupe.
- **No account deletion or data export (GDPR).** `GET /api/members/me/export` is mentioned once, but there's no requirement or task.
- **No consent or legal basis** for storing LinkedIn-sourced prospect data.

### Messaging "within 5 seconds" (Req 4.2) has no mechanism
- There are no WebSockets, SSE, polling interval, or push. Vercel serverless can't hold connections.
- Email is sent inline in the request, with no queue, retry, or outbox. If Resend is slow or down, the 5-minute email SLA (Req 16) can't be met, and it may fail the user's request.
- Each message triggers an email. Chatting 30 messages sends 30 emails; there's no digest or throttle.
- There's no max message length (`@db.Text`), and 50 messages/day across **all** conversations will throttle normal active users.

### Recommendations can't meet Req 5.2 and the algorithm is weak
- **"5–20 recommendations"** is impossible at launch with fewer than 5 eligible members, and the spec doesn't say what happens then.
- **`lastActive` is never updated** by any design or task, so recency is either always 100 or decays for everyone equally.
- **Domain words are dropped by the tokenizer.** `word.length > 3` drops "AI", "ML", "B2B", "GTM", "CTO", "CFO", "VC", "PR". There's no stemming, so "fundraise" doesn't match "fundraising".
- **The overlap score can be gamed.** `calculateOverlap` divides by `min(size)`. A target whose need is the single word "help" gets 100% from anyone who writes "help". Keyword-stuffed offerings score 100% against everyone.
- **Role matching is asymmetric and ignores the viewer's secondary roles.** Founder→Investor scores 70, while Investor→Operator scores 0. A founder who is also an angel investor is scored as founder only.
- **Tags don't match across formats.** Expertise tags are free text and case-sensitive, so "Machine Learning" ≠ "machine-learning".
- **Dead reason type.** `mutual_connection` is declared but never computed.
- **The design's own unit test fails.** Founder→Investor roleMatch = 70, but the test asserts `toBeGreaterThan(70)`.
- **Storage isn't designed.** "Refresh when profile updated" implies stored recommendations, but there's no table or cache. Computing on the fly is O(N) per page view.
- **Self-exclusion** from recommendations and search isn't specified.

### Search ranking ignores the search query
In `rankSearchResults`, `textMatchScore` is computed and then **not used**. The ranking is 70% relevance-to-searcher plus 30% completeness.
- **Break:** searching for "Jane Smith" puts Jane Smith on page 3 behind a random investor.
- **Short names are dropped.** Query tokens of 3 characters or fewer are removed, so searching "Ana", "Li", or "Mei" returns nothing to rank.
- **Full-text search isn't designed.** "PostgreSQL full-text search with GIN indexes" has no `tsvector` column. `@@index([expertiseAreas])` is a btree on an array, which is useless for this.
- **The 2s SLA is at risk.** Ranking happens in JS after fetching all matches, so pagination can't happen in the DB. At the claimed ~10k-member scale, that threatens the SLA.

### Profile completeness is undefined
- **"60% = required + at least 2 optional"** has no actual formula.
- **Required fields that aren't on Profile:** `REQUIRED_FIELDS` lists `name`/`email` (on User) and `checkSizeRange` (the schema has `checkSizeMin`/`checkSizeMax`).
- **Secondary roles' required fields** aren't addressed.
- **Registration doesn't create a Profile.** It collects only name, email, and role. Tasks never say when the Profile row is created, but search, recommendations, and completeness all assume it exists.
- **The nightly completeness cron** is in the design but missing from tasks, and redundant if scores are recomputed on save.

### Admin/outreach gaps
- **Email is required and unique on PotentialMember.** LinkedIn- or event-sourced prospects without an email can't be recorded. Dedupe should also consider the LinkedIn URL.
- **No owner/assignee** on potential members. Two admins can still both contact the same person, which is the stated goal of Req 6 ("avoid duplicate outreach").
- **Conversion metrics (Req 20.2) need a status-change history.** Status can change via `PATCH` without an OutreachAttempt, and "the next status" is undefined for a non-linear funnel (FOLLOW_UP_NEEDED, terminal states).
- **Member growth (Req 20.3)** has no `approvedAt` field. Should it count registration or approval?
- **The follow-up queue (Req 7.3)** has no timezone rule, and terminal or converted records with a stale follow-up date will stay in it.
- **CSV import is all-or-nothing or partial, depending on where you read.** The UX flow says invalid means show errors; Req 19.4/19.5 imply partial import. The spec also doesn't cover:
  - duplicate emails within one file
  - file size or row limits (the body is JSON `csvData`, and Vercel caps request bodies at 4.5MB)
  - role values ("Builder" vs the `BUILDER` enum)
  - CSV formula injection
  - the "preview before commit" step mentioned in UX but absent from tasks.

### Contradictions between documents
| Topic | Doc A | Doc B |
|---|---|---|
| Test framework | design: Vitest | tasks 18.1: Jest |
| Tests required? | design: 80% coverage, all endpoints | tasks: all test tasks marked optional `*` |
| Checkpoints | "ensure all tests pass" (tasks 2, 7, 11) | tests aren't written until wave 14–15 |
| Archival schedule | design: weekly | tasks 17.2: monthly |
| Archival action | design comment: "archive" | design code: `deleteMany` |
| Post-login route | E2E: `/profile/edit` | tasks 3.3: `/onboarding` |
| Sessions | diagram: "Create session" in DB and session store | config: JWT |
| NextAuth API | "v5" | code uses v4 `getServerSession` |
| Req 9.2 vs 9.3 | hidden fields are hidden from **non-connected** members | connected members see only **non-hidden** fields, so hidden fields are never visible |
| Req 3.6 | "SHALL not notify the sender of the decline reason" (implies the sender learns of the decline) | design: decline is silent. But the request vanishes from the outgoing list and re-requesting returns 409, so the sender finds out anyway |
| Task waves | 3.3 onboarding needs completeness calc | 4.1 is in the same wave |
| Upstash edge rate limiter | used in security section | not in stack, env vars, or tasks. Also defines a second `middleware` export in the same file |
| Profile image / Blob storage | in stack; task 19.3 "test file upload" | no upload requirement, endpoint, or task |

### Validation that rejects valid input
- **LinkedIn URLs:** `url.startsWith('https://linkedin.com/')` rejects real URLs (`https://www.linkedin.com/in/...`). Also, `linkedInUrl` isn't in the Profile schema at all.
- **Error logging:** Req 17.4 says to log errors "for admin review", but there's no admin UI for it. The `Logger` singleton's `setContext` is shared across concurrent requests, so request IDs and user IDs bleed between requests.
- **Unsafe CSP:** the policy allows `'unsafe-eval' 'unsafe-inline'`, which negates most of the XSS protection.
- **Needless `dangerouslySetInnerHTML`:** `AdminNote` uses it for plain text.
- **Useless edge rate limit:** 100 requests per hour per IP across all routes will throttle normal browsing (React Query refetches) and shared offices.

---

## P2: Ambiguities to settle
- **Latency SLAs** (2s search, 3s login, 5s message) give no percentile and no dataset size.
- **"Per day"** for rate limits: rolling 24h, or calendar day in which timezone?
- **Req 1.1 "at least one Primary_Role"** while the schema has exactly one. A Secondary_Role can also duplicate the primary.
- **Req 2.2 location filter:** free text, no normalization.
- **Email notification preferences** have no unsubscribe link, as CAN-SPAM requires. Welcome and security emails aren't classified.
- **Connection-request messages** aren't specified as required or optional; the schema makes them required.
- **Expiry and the sender:** what the sender sees after expiry isn't specified, and an expired request blocks re-requesting (see #6).
- **Data retention for members** (deactivated accounts, messages) is unspecified.
- **Scale claim:** "Supports ~10,000 members" isn't backed by any load estimate given the in-memory ranking.

---

## Suggested next steps
1. Fix P0 #1–#6 in the design before task 6 starts: authz rules, rate limiter, JWT revalidation, privacy DTOs, and uniqueness.
2. Add requirements for:
   - trust & safety (block, report, remove connection)
   - email verification and password reset
   - application rejection and invitations
   - GDPR export and deletion
3. Specify profile creation at registration, the completeness formula, and `lastActive` updates.
4. Reconcile the contradiction table and make core tests non-optional.
