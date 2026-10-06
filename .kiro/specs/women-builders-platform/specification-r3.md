# Women Builders: Platform Specification, Revision 3

**Status:** Proposed. Awaiting your approval before anything is built.
**Date:** 6 October 2026

**What this document is.** A complete description of the Women Builders platform as it will be once every agreed feature and change is in place. It covers:
- what exists today;
- what changes;
- what is new, including the ideas taken from the client's reference landing page.

**Relationship to the other spec files.** Once approved, this document becomes the single source of truth. `requirements.md` (Revision 2) and `gap-resolutions.md` stay as history. Where they disagree with this document, this document wins.

**How to read the tags**

| Tag | Meaning |
|---|---|
| **Existing** | Built and working today. Described here so the spec is complete |
| **Changed** | Built today, but its behaviour changes in this revision |
| **New** | Not built yet |
| **R1** | First release. Build now, step by step (section 11) |
| **R2** | Next release. Specified now so R1 doesn't block it |

---

## Contents
1. [What Women Builders is](#1-what-women-builders-is)
2. [Decisions this revision rests on](#2-decisions-this-revision-rests-on)
3. [People, roles and permissions](#3-people-roles-and-permissions)
4. [Member-facing features](#4-member-facing-features)
5. [Admin features](#5-admin-features)
6. [Notifications and emails](#6-notifications-and-emails)
7. [Limits and timings](#7-limits-and-timings)
8. [Data model changes](#8-data-model-changes)
9. [API additions](#9-api-additions)
10. [Non-functional requirements](#10-non-functional-requirements)
11. [Release plan and build order](#11-release-plan-and-build-order)
12. [Removed, retired and out of scope](#12-removed-retired-and-out-of-scope)
13. [Open questions and suggestions for you](#13-open-questions-and-suggestions-for-you)

---

## 1. What Women Builders is

**Women Builders is a curated, invitation-only network** for women founders, operators, investors and builders. It helps members get somewhere with each other: a warm introduction, a seat at the right table, a check, a hire. Generic networking isn't the point.

### The core loop
1. **Request.** A woman asks for an invitation on the public site, or the team finds her through outreach. Both end up in the same outreach tracker.
2. **Review.** The team reviews the request and either invites her or declines politely. Everyone hears back within three weeks.
3. **Join.** She joins through her invitation, accepts the community charter, and builds a profile: what she does, what she needs, what she offers. She can add a photo.
4. **Discover.** She finds people through recommendations, the Discover directory and the Capital view of investors and founders raising.
5. **Connect.** She connects directly, or asks a mutual connection for a warm introduction.
6. **Meet.** She meets members in person or online at Gatherings: small dinners and working sessions.
7. **Talk.** She messages her connections.
8. **Share wins (R2).** Members log what came of it (an investment, a hire, an advisor), which shows the network works.

### Product principles
1. **Four equal roles.** Founder, operator, investor and builder are equally important. No role gets a premium tier, a different colour of badge, or a separate class of access. The Capital view is a lens on the directory, not a separate club.
2. **Outcomes, not advice.** Every feature should lead to a concrete next step: an introduction, a seat, a conversation, a win.
3. **Curated and invitation-only.** Nobody gets an account without an invitation.
4. **Private by default, silent declines.** Declines are never announced, and hidden details stay hidden.
5. **People first, not feeds.** No timeline, likes or follower counts.
6. **One pipeline.** Inbound requests and outbound outreach live in the same tracker, with one do-not-contact list.
7. **Real numbers only.** Public stats come from real data and appear only once they're meaningful.

---

## 2. Decisions this revision rests on

| # | Decision | Choice |
|---|---|---|
| 1 | Name | Keep **Women Builders** |
| 2 | How people join | **Invitation only.** Public visitors request an invitation; there is no self-registration |
| 3 | Paid membership | **Not now.** No fees, billing or renewals |
| 4 | Gatherings (dinners and sessions) | **In the first release** |
| 5 | Roles | **All four roles equal** |
| 6 | Scope | Build all "add now" items (R1), step by step. Specify the "add next" items (R2) |
| 7 | Account deletion | Telegram style: the person's details are erased, conversations stay for the other person as "Deleted account" (already built) |
| 8 | Messaging limits | No daily message limit. Only the 20-unanswered-in-a-row cap (already built) |
| 9 | Eligibility wording | "A community for women founders, operators, investors and builders." (already built) |
| 10 | The client's landing page | Inspiration and reference, not a specification |
| 11 | Visual direction | The reference page's warm, editorial look is the starting point for the designer (**please confirm**, see section 13) |

---

## 3. People, roles and permissions

| Person | Has an account? | Can do |
|---|---|---|
| **Visitor** | No | Read the public site and charter, request an invitation, log in |
| **Requester** | No (she's a record in the outreach tracker) | Nothing beyond a visitor. She gets an acknowledgement email and a decision email |
| **Invitee** | Not yet | Open her invitation link and join |
| **Member** | Yes, active | Everything in section 4 |
| **Admin** | Yes, active, admin flag | Everything in section 5. An admin can also be a member with a profile |
| **Deactivated member** | Yes, inactive | Log in only to reactivate (if she deactivated herself), or see a "contact us" message (if an admin deactivated her) |
| **Deleted account** | Shell only | Nothing. Other members see her only as "Deleted account" in old conversations |

**Changed:** the *pending applicant* and *rejected applicant* account states are retired (section 12), because people no longer create accounts before they're accepted.

---

## 4. Member-facing features

### F1. Public website — **Changed · R1**
**Purpose:** explain the network, earn trust, and turn the right visitors into invitation requests.

**Pages**

| Path | Page |
|---|---|
| `/` | Home |
| `/charter` | Community charter (F2) |
| `/request-invite` | Request an invitation (F3). The form also appears at the bottom of Home |
| `/privacy`, `/terms` | Privacy policy and terms. **The client or their lawyer must supply the text before launch**; we ship clearly marked placeholders |
| `/login` | Log in (existing) |

**Home sections, in order**
1. **Hero:**
   - one-line value proposition, e.g. "Where women who build find each other";
   - one sentence on what the network does;
   - **Request an invitation** (primary) and **Log in** (secondary).
2. **Who it's for:** four equal cards for Founders, Operators, Investors and Builders. Each says what that role gets from the network and brings to it.
3. **What membership gives you** (four items):
   - Warm introductions (F12)
   - The Capital view (F9)
   - Gatherings (F14)
   - Matching on needs and offers (F10)
4. **How joining works:** Request → reviewed by our team → you hear back within three weeks, either way → join by invitation.
5. **Live numbers:** see the rules below.
6. **Upcoming gatherings** (teaser): only gatherings an admin marks "show on public site". Shows type, title, city (or "Online") and month. Never the venue, date or attendees.
7. **Featured members and quotes (R2, F16):** opt-in only. This section stays hidden until there's content.
8. **Request an invitation:** the form (F3).
9. **Footer:** charter, privacy, terms, contact email, log in.

**Live numbers rules**
- Every number comes from real data:

  | Number | Counts |
  |---|---|
  | Members | Active members with a profile |
  | Countries | Distinct countries among active members. Hidden locations count in the total but are never shown individually |
  | Introductions made | Accepted introductions (F12) |
  | Gatherings held | Past gatherings with at least one attendee marked present |
  | Wins (R2) | Logged wins (F15) |

- A number only appears once it passes its threshold: members ≥ 50, countries ≥ 5, introductions ≥ 25, gatherings ≥ 3, wins ≥ 10. Below its threshold, that number is simply not shown.
- R1: the thresholds live in configuration. R2: admins can change them or hide any number (F26).

**Content rules**
- No member data appears publicly except opt-in showcase content (R2).
- No invented numbers, logos or quotes.
- Copy tone: direct, warm, concrete. Lead with outcomes, not superlatives. Example microcopy: "One reply from a human, either way."
- SEO basics: title, description, Open Graph image, canonical URLs.

### F2. Community charter — **New · R1**
**Purpose:** a short, plain set of rules everyone agrees to. It underpins safety, confidentiality at gatherings, and introduction etiquette.

**Content.** We write a placeholder draft; the client finalizes it. Sections:
- who this community is for;
- how we treat each other;
- confidentiality: what's shared at a gathering stays there unless the person says otherwise;
- introductions etiquette: ask with context, respect a "no";
- no selling or spam;
- zero tolerance for harassment;
- how reports work and their consequences.

**Rules**
- **Versioning:** the charter has a version number (`CHARTER_VERSION`, configuration in R1).
- **Accepting at joining:** accepting the current version is required to join. A checkbox links to `/charter`. We store the version and the time.
- **New version:** when the version changes, members see a one-screen interstitial on their next login and must accept before continuing. Exporting data, deactivating and deleting stay available without accepting.
- **Reports:** the report dialog links to the charter.
- **Admin view:** member detail shows which version a member accepted and when.

### F3. Request an invitation — **New · R1** (review rules R2)
**Purpose:** the only public way in. Every request becomes a record in the outreach tracker, so inbound and outbound outreach are one pipeline.

**Form**

| Field | Required | Limits / notes |
|---|---|---|
| Full name | Yes | 2–100 characters |
| Email | Yes | Valid email, normalized |
| LinkedIn profile | No, but encouraged ("helps us review faster") | Any linkedin.com/in URL, canonicalized |
| Primary role | Yes | Founder, Operator, Investor or Builder |
| City | No | ≤ 100 |
| Country | Yes | From a country list |
| What are you building or working on? | Yes | 20–1,000 characters |
| Who referred you? | No | ≤ 120 |
| Consent | Yes | "I agree that Women Builders may store these details to review my request. See the privacy policy." |

**Abuse protection**
- A hidden honeypot field.
- At most 5 submissions per IP address per hour, and at most 3 per email address per day.
- The submit button is disabled while sending.

**What happens on submit.** Every case shows the visitor the same confirmation, so the form never reveals who is already known:

> *"Thank you. We've received your request. Our team reads every request, and you'll hear back within three weeks, either way."*

| Situation (matched by normalized email or LinkedIn) | What the system does |
|---|---|
| Not known | Create a prospect with status **Requested**, discovery source "Website request", and a "why we hold this record" note recording the consent and date. Open a request in the Requests queue. Send the acknowledgement email |
| Known prospect, status before Invited (Identified … Interested) | Attach the request to the existing prospect, add a note, set the status to **Requested**, open a request, send the acknowledgement |
| Known prospect with a live invitation | Re-send the invitation email to that address. No new request |
| Known prospect declined (Not a fit) less than 90 days ago | Add a note "Requested again on <date>". No status change, no new request, no email |
| Known prospect declined 90 or more days ago, or Not interested | Treat as a new request: set status to Requested, open a request, send the acknowledgement |
| **Do not contact** | Add a note "Requested an invitation on <date>" for admins. **No status change and no email.** An admin decides by hand whether to lift the do-not-contact flag |
| Already an active member | Send an email to that address: "You already have an account. Log in or reset your password." No request |

**Requests queue (admin, R1).** Covered in F21.

**Review rules (R2):**
- two approvals required (configurable 1–3);
- automatic outcomes once the threshold is reached, with split votes flagged for an admin;
- an "applications open / waitlist" switch.

All in F21.

### F4. Invitations and joining — **Changed · R1**
**Where invitations come from**
1. **A request:** the Invite action in the Requests queue (F21).
2. **Outbound:** an admin invites a prospect from the outreach tracker, or any email from the Invitations page. These already exist.

**Invitation rules**
- **Existing:** single use, bound to one email address, expires after 14 days, and refused for do-not-contact records and existing members.
- **New:** if an invitation is still unused after 7 days, a single reminder email is sent.
- **New:** an expired or used link shows *"This invitation has expired"* with **Request a new one**. That opens the request form pre-filled, and the new request attaches to the existing prospect.

**Join form** (`/join?invite=…`). The address `/register` redirects here.

| Field | Notes |
|---|---|
| Email | Fixed (from the invitation) |
| Full name | Pre-filled from the prospect record, editable |
| Password | Existing rules (8+ characters with an uppercase letter, a lowercase letter and a number) |
| Primary role | Pre-filled from the request if known |
| Headline | ≤ 120 |
| City, Country | Pre-filled from the request |
| Charter | Required checkbox (F2) |

**On join**
- The account is created as active. The invitation link proves the email address, so there's no separate confirmation step.
- The prospect's status becomes **Joined**.
- A welcome email is sent, and she goes to the onboarding wizard (F6).

**Without an invitation,** `/join` shows: *"Women Builders is invitation-only."* plus **Request an invitation**.

### F5. Accounts and security — **Existing**, small changes
Unchanged:
- Database sessions that are re-checked on every request.
- Login throttling: 5 failures per email and IP in 15 minutes; a lock after 50 failures per hour from any IP.
- The same generic error for an unknown email, a wrong password or a locked account.
- Password reset (1-hour link) and change password.
- Self-deactivation, with reactivation by logging in.
- Data export.
- Telegram-style deletion (F19).

**Changed:**
- There's no public registration endpoint.
- Email confirmation for applicants is retired (section 12).
- The charter interstitial is added (F2).

### F6. Profiles — **Changed · R1**
**Fields** (✚ = new in R3, ✎ = changed)

| Section | Field | Type / limits | Hideable from non-connections |
|---|---|---|---|
| Basics | Full name | 2–100 | No |
| | ✚ Photo | JPEG, PNG or WebP, ≤ 5 MB, cropped square (see below) | No |
| | Headline | ≤ 120 | No |
| | Primary role / other roles | One primary; up to 3 others | No |
| | ✎ City | Free text ≤ 100 (was the single "location" field) | Yes (as "Location", with country) |
| | ✚ Country | From a country list | Yes (as "Location") |
| | LinkedIn, Website | URLs | Yes |
| About | Expertise | Tags ≤ 20 | No |
| | Professional background | ≤ 5,000 | Yes |
| | Current focus | ≤ 1,000 | Yes |
| Needs & offers | What I need / What I can offer | ≤ 2,000 each | Yes |
| Founder | Company name (required) | ≤ 120 | Yes |
| | Company stage (required) | Idea … Public (existing list) | No |
| | Industry | ≤ 80 | No |
| | Funding status | Not raising / Raising now / Raising in 6 months / Recently closed a round | Yes |
| | ✚ Raise amount | USD thousands. Shown only when raising now or in 6 months | Yes |
| Operator | Function (required), Seniority (required), Focus areas | Existing lists | No |
| Investor | ✚ Firm or fund name | ≤ 120, optional (angels may leave it blank) | No |
| | ✚ Investor type | Angel / VC fund / Family office / Corporate / Syndicate lead / Other | No |
| | Investment stages (required) | Pre-seed … Growth | No |
| | Check size range (required) | USD thousands | Yes |
| | Sectors | Tags ≤ 20 | No |
| | ✚ Leads rounds | Leads / Follows / Both | No |
| | ✚ Currently investing | Yes / Paused. Confirmed every 90 days (F9) | No |
| | ✚ Last check written | Month and year, optional | No |
| Builder | Technical skills (required), Project types, Collaboration interests | Existing | No |

**Photos**
- **Upload:** in the editor and onboarding. A crop to square happens in the browser.
- **Processing on the server:**
  - the file type is checked from its content, not its name;
  - **location and camera metadata (EXIF) are removed**;
  - two sizes are stored: 512 px and 128 px (WebP).
- **Who can see them:** served only through our own address, `/api/media/avatar/:id/:size`, and only to active members who aren't blocked by or blocking the owner. Photos appear publicly only through the opt-in showcase (R2).
- **Removal:** the member can remove it any time. An admin can remove it (and the member is told why: "didn't meet the charter"). Deleting the account deletes the photo.
- **Fallback:** initials. Deleted accounts show a neutral "ghost" avatar.

**Completeness (Changed)**
- **Formula:** unchanged, `round(100 × filled ÷ applicable fields)`.
- **Core fields,** now 8: headline, **photo**, professional background, expertise (≥ 1), current focus, needs, offerings, **country**. The old free-text "location" field is replaced by country.
- **Role fields** (counted for every role a member holds):
  - Founder: company name, stage, industry, funding status
  - Operator: function, seniority, focus areas
  - Investor: **investor type**, stages, check size, sectors
  - Builder: skills, project types, collaboration interests
- **Gate:** unchanged. 60% and the primary role's required fields unlock sending connection requests and asking for introductions.

**Onboarding wizard (Changed)**
1. Basics: adds photo, city and country.
2. Your roles.
3. Expertise and focus.
4. Needs and offerings, plus privacy, plus introduction preferences (F12).

**Migration**
- Existing "location" text moves to City. Country starts empty, and members see a prompt to add it.
- Completeness scores are recalculated.

### F7. Privacy and visibility — **Existing + Changed**
**Always visible to members:**
- name, photo, headline, roles, expertise;
- firm or fund name, investor type, stages, sectors, leads rounds, "currently investing".

**Hideable from non-connections:**
- location (city and country together), professional background, current focus, needs, offerings;
- company name, funding status, raise amount, check size, LinkedIn, website.

Connections see everything. **Email is never shown** to other members.

**New surfaces and their rules**

| Surface | Rule |
|---|---|
| Mutual connections (F12) | Shown only to the viewer, and only those mutual connections who allow introduction requests |
| Gathering attendees (F14) | Visible only to confirmed attendees of that gathering, minus anyone they've blocked or who blocked them |
| Gathering venue and online link | Visible only to confirmed attendees |
| Photos | Members only. Public only through the opt-in showcase (R2) |
| Public numbers | Aggregated, and only above their thresholds (F1) |
| Request form data | Stored as a prospect record with recorded consent. Seen only by admins |

### F8. Discover (directory search) — **Changed · R1**
Unchanged:
- keyword search with name matches ranked first;
- filters for primary role, other roles, expertise;
- privacy-aware matching;
- 20 results per page.

**Changed:**
- **Filters:** **country** (list) and **city** (text) replace the single location box.
- **New filters:** **Currently investing** (shown when Investor is selected), **Raising now** (shown when Founder is selected), and **Prefers introductions** (a tag on the card, not a filter).
- **Cards:** now show the photo, plus "*N mutual connections*" when greater than 0.

### F9. Capital view — **New · R1**
**Purpose:** make the capital side of the network easy to use without making investors a separate tier. It's a dedicated view of the same directory, at `/capital`, with two tabs.

**Tab 1: Investors.** Active members who hold the Investor role, primary or secondary.

- **Filters:**
  - Stage (multi).
  - "I'm raising checks of $___". This shows investors whose range includes that amount.
  - Sector.
  - Investor type.
  - Leads / follows.
  - Country.
  - **Currently investing** (on by default).
- **Sort order:**
  1. Currently investing and confirmed in the last 90 days.
  2. Most recent "last check written".
  3. Relevance to the viewer (F10).
  4. Name.
- **Card:** photo, name, firm, investor type, stages, check range (if visible to this viewer), sectors, city, "Last check: Aug 2026", and how to reach her:
  - **Connected:** Message.
  - **Prefers introductions, with mutuals:** Ask for an introduction.
  - **Prefers introductions, no mutuals:** "Prefers introductions. No one in your network knows her yet."
  - **Otherwise:** Connect, plus Ask for an introduction if there are mutuals.
- **Freshness:**
  - Every 90 days, an investor is asked "Are you still investing?" by email and on her Home page, with the answers Yes / Paused.
  - If she hasn't confirmed for 120 days, her card shows "Status not confirmed" and she drops out of the default "Currently investing" filter.
  - In R2, confirmed investment wins (F15) update "last check written" automatically.

**Tab 2: Founders raising.** Founders whose funding status is *Raising now* or *Raising in 6 months*, respecting hidden fields. A founder who hides her funding status from non-connections doesn't appear here for them.
- **Filters:** stage, industry, country, raise amount range.
- **Card:** photo, name, company (if visible), stage, industry, raise amount (if visible), headline, and the same "how to reach her" actions.

**Equal roles.** The Capital view is one lens. Discover stays the main directory for everyone, and the Home page features matches for every role.

### F10. Recommendations — **Changed · R1**
Unchanged:
- up to 20 recommendations, with an encouraging empty state below 5;
- the weighted score: role fit 30%, needs↔offers 40%, expertise 20%, recent activity 10%;
- the exclusions: you, your connections, pending requests either way, blocked members, dismissed members (30 days), inactive members;
- explanations built only from fields the viewer can see.

**Changed:**
- **Founder↔investor role fit:** scores 100 only when the founder's stage is one of the investor's stages *and* the investor is currently investing. Otherwise it scores 70 (today it's always 100).
- **New reasons:**
  - "Investing at your stage"
  - "*N* mutual connections can introduce you"
  - "Going to the same gathering"
  - "Also in <city>" (a reason only; it doesn't affect the score)
- **Actions:** members who prefer introductions can still be recommended. The card's action becomes **Ask for an introduction**.

### F11. Connections — **Changed · R1**
**Unchanged:**
- connect with an optional note of up to 500 characters;
- 20 requests per rolling 24 hours, and one pending request per pair;
- crossing requests connect immediately;
- declines are silent;
- withdrawing a request applies a cooldown until the original expiry;
- requests expire after 30 days;
- remove connection, with read-only history;
- the connections list with search, and the requests page.

**New: "Prefer introductions"** (a setting, off by default; investors are prompted about it in onboarding).
- **When on:** nobody can send her a direct connection request. Her **Connect** button is replaced by **Ask for an introduction**.
- **Exception:** people who attended the same gathering can connect directly for 30 days afterwards. The request is pre-filled with "We met at <gathering>".
- **Turning it on** doesn't affect requests that are already pending.

### F12. Warm introductions — **New · R1**
**Purpose:** let a member reach someone through a mutual connection who can vouch for her. Everyone involved opts in, and no "no" is ever announced.

**People involved:** **A** asks, **B** introduces (a mutual connection), **C** is the person A wants to meet.

**Flow**
1. **A asks.** On C's profile or card, A sees "*N* of your connections know C" and picks B. Only mutual connections who allow introduction requests are listed. A writes:
   - a note to B (why, up to 1,000 characters);
   - optionally, a note for C (up to 500 characters), forwarded only if B agrees.
2. **B decides,** within 14 days:
   - **Introduce:** with an optional personal note to C, up to 500 characters.
   - **Not this time:** silent.
3. **C decides,** within 14 days of being introduced:
   - **Accept:** A and C are connected (or reconnected). Their conversation opens with a note: *"Introduced by B"* plus B's and A's notes.
   - **Not now:** silent.
4. **Outcomes:**
   - A and B are told when C accepts.
   - Declines and expiries are never announced. After its time runs out, A's request just shows *"No introduction was made."*

**Rules**
- **Asking:** A needs the same profile completeness as for sending connection requests.
- **Blocks:** if A and C have blocked each other in either direction, C is invisible to A, so no introduction is possible. Blocking also hides any pending introductions between the pair.
- **No double routes:** A can't ask for an introduction to C while A has a pending connection request to C, or the other way round.
- **Limits:**
  - at most 5 open introduction requests per member;
  - 1 open request per target;
  - 1 request per introducer per target every 90 days.
- **Settings:**
  - "Let members ask me for introductions" (on by default). When off, she is never listed as a mutual connection.
  - "Prefer introductions" (F11).
- **Privacy:** listing B as a mutual connection reveals to A that B and C are connected. This is the normal convention in professional networks, and B can opt out with the setting above.
- **Introductions page** (`/introductions`), with three tabs:
  - **Asked of me:** I'm the introducer. Pending first, with Introduce / Not this time.
  - **For me:** I'm the person being introduced to. Accept / Not now, with both notes.
  - **My requests:** my asks, with a status: *Waiting for B* → *B introduced you, waiting for C* → *Connected*, or *No introduction was made*.
- **Reporting:** available from any introduction.
- **Counts:** made = forwarded, accepted = connected. These appear on the admin dashboard and the public site.

### F13. Messaging — **Existing**
- Only between connections.
- Delivery: the open conversation checks for new messages every 3 seconds.
- Max 5,000 characters per message.
- **No daily limit.** Only a cap of 20 messages in a row without a reply.
- Message emails are bundled: at most one per conversation per 30 minutes, and none if already read.
- Read receipts, retry on failure, report a message.

Conversations become read-only when:
- the connection is removed;
- the other member is inactive;
- the other member **deleted her account**. She then appears as "Deleted account", and the history is kept.

**Changed:** conversations that started from an introduction open with the introduction note (F12).

### F14. Gatherings — **New · R1**
**Purpose:** small, curated meetings: dinners in a city ("tables") and working sessions on a topic ("rooms"), in person or online. They make the network real.

**Gathering types**

| Type | Default seats | Format |
|---|---|---|
| Dinner | 12 | In person |
| Working session | 20 | In person or online |
| Other | Set by admin | Either |

**What an admin sets** (F23)
- **Basics:** title (≤ 120), type, topic or description (≤ 3,000), date and start time with time zone, duration.
- **Location:** city and country, or online. The venue address or online link is visible to confirmed attendees only.
- **Seats:** the number of seats.
- **Who it's for:** all members, selected roles, or **invite-only** (only invited members see it).
- **Seat mode:**
  - **Curated:** members request a seat and the team confirms.
  - **Open:** first come, first served, with an automatic waitlist.
- **Requests close at:** a date and time.
- **Hosts:** members and/or "the Women Builders team".
- **Show on public site:** off by default.

**Member experience**
- **Gatherings page** (`/gatherings`): upcoming gatherings, with those in her country first, then online, then others. Filters: type, city, online.
- **Gathering detail:** what, when (in the gathering's local time; online sessions also show her own time), where (city only until confirmed), seats left (Open mode), hosts, and **Request a seat** or **Take a seat**.
- **Seat request:** an optional note, "what you'd bring or want from it" (≤ 300 characters). One request per gathering.
- **Statuses:** *Requested* → *Confirmed* / *Waitlisted* / *Not this time*.
  - Not this time is sent as a gentle email: "We couldn't fit you at this one. We'd love to see you at the next."
  - Waitlisted members are promoted automatically when a seat frees up (Open mode), or by an admin (Curated mode).
- **Once confirmed:**
  - the venue or link;
  - **Who's coming:** attendees and hosts, with photo, name, headline and role;
  - **Add to calendar** (`.ics` file);
  - **Cancel my seat.** Cancelling within 24 hours of the start is recorded as a late cancellation.
- **Reminders:** 2 days before and on the morning of the gathering.
- **After the gathering:** for 30 days, attendees see **People you met** with one-tap Connect, pre-filled with "We met at <title>". This works even if the other person prefers introductions (F11).
- **My gatherings:** upcoming and past.

**Safety**
- If two people who have blocked each other both request seats, the admin request queue shows a **conflict flag**. Neither is ever shown to the other in "Who's coming".
- Gatherings are covered by the charter's confidentiality rule.

**Notifications:**
- new gathering near you (same country or online);
- seat confirmed, waitlisted, promoted or declined;
- reminders;
- gathering changed or cancelled.

Seat-related emails always send; "new gathering near you" can be turned off.

### F15. Wins — **New · R2**
**Purpose:** record what the network produced. It celebrates members, proves value, and feeds real public numbers.

**Logging a win**
- **Where:** Home, the Introductions page, past gatherings, a connection's profile, or the prompts below.
- **Fields:**
  - **Type:** Investment, Hire, Advisor or mentor, Customer or partnership, Co-founder, Speaking or press, Other.
  - **With whom:** one or more members (optional), or "someone outside the network".
  - **How it happened:** an introduction (which one), a connection, a gathering (which one), or other.
  - **Month:** required.
  - **Amount:** optional, for investments. **Always private**, used only in team totals.
  - **Story:** ≤ 500 characters.
  - **Visibility:** **Count it anonymously** (default) / **Members can see it** / **May be quoted on the public site**.

**Confirmation**
- Every named member is asked to confirm ("Amara says you closed a round together. Is that right?").
- Confirmed wins are marked *verified*.
- A confirmed investment win updates the investor's "last check written" (F9).

**Prompts.** At most one per item. A member can turn them off.
- 60 days after an accepted introduction: "Did anything come of meeting C?"
- 14 days after a gathering.

**Where wins show**
- Shared wins appear on the member's own profile ("Wins") and in a small "Recent wins" module on Home. There's no feed.
- Anonymous wins appear only in totals.

**Limits:** 20 wins per member per month.

### F16. Public showcase and quotes — **New · R2**
- **Opt-in:** a member setting, **Feature me on the public website** (off by default). It allows her name, photo, headline, role and city to appear on Home.
- **Choosing who appears:** admins pick up to 6 opted-in members (F26).
- **Quotes:** members can submit a quote (≤ 280 characters) from Settings, or by allowing a win to be quoted. Admins approve which quotes appear.
- **Withdrawing:** switching the setting off removes her from the site immediately.

### F17. Safety — **Existing + Changed**
**Existing:**
- **Block:** mutual invisibility. Removes the connection, cancels requests, silent.
- **Report:** confidential, with reasons and details. Reports survive account deletion.
- **Remove connection.**
- **Admin reports queue,** plus deactivation that ends sessions immediately.

**Changed:**
- New report reason **"Inappropriate photo"**. Admins can remove a photo directly from the report.
- Report is available from introductions and from gathering pages.
- Gathering block conflicts are flagged (F14), and blocked pairs are hidden from each other in attendee lists.
- Reports link to the charter (F2).

### F18. Home (member dashboard) — **Changed · R1**
1. A profile completeness prompt, if needed (existing). New: a country prompt for migrated profiles, and an investor "still investing?" prompt.
2. **To do:** pending connection requests, introductions waiting on her (as introducer or as the person being introduced), and seat updates.
3. New messages (existing).
4. **Your next gatherings** and **Gatherings near you**.
5. Recommended for you (existing).
6. (R2) Recent wins, and a "Share a win" button.

### F19. Settings and data rights — **Changed**
**Sections**
1. **Email notifications:** the existing toggles plus introductions, gatherings near me, investing check-ins (investors), and (R2) win confirmations and prompts.
2. **Introductions:** "Let members ask me for introductions" and "Prefer introductions".
3. **Password.**
4. **Blocked members.**
5. **(R2) Public website:** the showcase opt-in and my quote.
6. **Your account and data:**
   - **Download:** now also includes introductions, gathering history and (R2) wins.
   - **Deactivate.**
   - **Delete:** Telegram style.

**Deletion, extended to the new features:**
- Pending introductions involving her are cancelled silently.
- Seat requests and confirmed seats are cancelled. Admins are notified if the gathering is within 7 days.
- Her photo is deleted.
- In other members' wins she appears as "Deleted account". Wins she logged keep their counts but lose their story text.

---

## 5. Admin features

### F20. Outreach tracker (potential members) — **Changed · R1**
Unchanged:
- add a prospect, with duplicate checks on email and LinkedIn;
- permanent do-not-contact suppression;
- owners, notes, the outreach log, full status history;
- the follow-up queue (date-only, in the platform's timezone);
- two-step CSV import (preview, then import, with partial import allowed);
- invitations;
- archiving after 2 years (never for do-not-contact records).

**Changed statuses:**

| Status | Change |
|---|---|
| Identified, Reviewed, Contacted, Follow-up needed, Interested | Unchanged |
| **Requested** | **New.** Asked for an invitation (F3) |
| Invited | Unchanged |
| ~~Applied~~ | **Retired.** Existing records migrate to Requested |
| **Joined** | **Renamed** from "Approved". Same meaning: became a member |
| Not interested, Not a fit, Do not contact | Unchanged |

**New:** the prospect page shows the full request (the form answers, consent and date) and links to it in the Requests queue.

### F21. Requests queue — **New · R1** (votes R2)
This replaces the old Applications page.

**R1**
- **List:** open requests, oldest first. The **overdue** marker in red shows after 21 days.
- **Each request shows:**
  - all form answers;
  - LinkedIn (a link);
  - existing prospect history and notes;
  - duplicate matches (prospects or members);
  - the referrer if she's a member.
- **Actions:**
  - **Invite:** sends the invitation (F4). Status becomes Invited.
  - **Decline:** sends a neutral email ("We aren't able to offer membership right now. You're welcome to ask again in 90 days."). Status becomes Not a fit.
  - **Mark as spam:** closes it silently and archives the prospect. No email.
  - Every action takes an optional internal note and is recorded in the audit log.
- **Admin nav badge:** the number of open requests, with overdue requests highlighted.
- **Overdue alert:** a weekly email digest to admins listing overdue requests.

**R2: review rules**
- **Required approvals:** set from 1 to 3 (default 2), in Settings (F26).
- **Voting:** each admin votes **Approve** or **Decline**, with a private note, and can change her vote until the request is decided. Votes are visible to admins only.
- **Outcomes:**
  - Approvals reach the threshold: the invitation is sent automatically.
  - Declines reach the threshold: the decline email is sent automatically.
  - Split votes are flagged **Needs decision**.
  - Any admin can decide directly at any time; this overrides the votes.
- **Applications open / waitlist** switch, with an optional "next review" line such as "Next review: March".
  - While on waitlist, the public form reads "Join the waitlist", and the acknowledgement says when requests will be reviewed.
  - Waitlisted requests are listed separately. Their 21-day clock starts when applications reopen.

### F22. Members, reports, invitations and audit — **Existing**, small changes
- **Members list and detail:** unchanged, apart from:
  - photo, with a **Remove photo** action;
  - charter version accepted;
  - counts for introductions (asked, made, accepted) and gatherings (requested, attended, no-shows);
  - a Deleted filter (existing).
- **Invitations page:** unchanged, plus a "reminder sent" column.
- **Reports and audit log:** unchanged. New audit actions:
  - `request.invite`, `request.decline`, `request.spam`
  - `gathering.create` / `update` / `cancel`, `seat.confirm` / `decline`
  - `photo.remove`
  - (R2) `request.vote`, `settings.update`, `showcase.update`

### F23. Gatherings admin — **New · R1**
- **List:** upcoming and past gatherings, with seats confirmed out of capacity and the number of pending requests.
- **Create and edit:** all the fields in F14. Editing the date, time or place notifies confirmed attendees.
- **Request queue for a gathering:**
  - each requester's card, with role, city and note;
  - a **live mix** of confirmed seats by role (e.g. "Founders 4 · Investors 3 · Operators 2 · Builders 1") to help balance the table;
  - **conflict flags** for blocked pairs;
  - actions: **Confirm**, **Waitlist**, **Not this time**, and bulk confirm.
- **Message confirmed attendees:** a one-off email, such as "Parking details".
- **Attendance:** after the gathering, mark each person attended or no-show. Members with repeated no-shows are flagged in curated queues.
- **Cancel the gathering:** notifies everyone with a request, with a reason.

### F24. Admin dashboard — **Changed · R1**
**Tiles**
- active members (and new in the period);
- **open requests** (overdue in red);
- open reports;
- follow-ups due in the next 7 days;
- **introductions** in the period: asked, made, accepted;
- **upcoming gatherings,** with seats filled out of capacity.

**Charts and tables**
- new members by month (existing);
- **members by country** (top 10);
- **active members in the last 30 days**;
- outreach conversion (existing, with the new statuses);
- prospects by status (existing).

**R2:** wins by type and month, wins that came from introductions and from gatherings, and the investment total (from opted-in amounts only).

### F25. Admin invitations from the tracker — **Existing**
Unchanged. It's listed here so this section is complete.

### F26. Site settings — **New · R2**
One page for:
- applications open / waitlist and the "next review" text;
- required approvals;
- public numbers (thresholds, show/hide each);
- the showcase selection (up to 6);
- quote approval.

All changes go into the audit log. **In R1, these values live in configuration.**

---

## 6. Notifications and emails

"Always" = transactional, can't be switched off. Otherwise the named preference applies, and the email carries a one-click unsubscribe link.

| Email | Trigger | Preference | Release |
|---|---|---|---|
| Request received | Request submitted (F3) | Always | R1 |
| Request received, waitlist version | Submitted while on waitlist | Always | R2 |
| "You already have an account" | Member's email used on the request form | Always | R1 |
| Request declined | Decline (F21) | Always | R1 |
| Invitation | Invite | Always | Existing |
| Invitation reminder | Unused after 7 days | Always | R1 |
| Welcome | Joined | Always | Existing |
| Charter updated | New charter version | Always | R1 |
| Password reset, unusual sign-in, deactivated by admin | Existing triggers | Always | Existing |
| Connection request / accepted | Existing triggers | Connection requests / Accepted requests | Existing |
| New messages (bundled) | Existing trigger | New messages | Existing |
| Introduction asked of you | A asks B | Introductions | R1 |
| You've been introduced | B introduces A to C | Introductions | R1 |
| Introduction accepted | C accepts (to A and B) | Introductions | R1 |
| New gathering near you | Gathering published (same country or online, and audience matches) | Gatherings near me | R1 |
| Seat confirmed / waitlisted / promoted / not this time | Seat changes | Always | R1 |
| Gathering reminder | 2 days before; morning of | Always | R1 |
| Gathering changed / cancelled | Admin edit or cancel | Always | R1 |
| Message to attendees | Admin sends | Always | R1 |
| Still investing? | Every 90 days, investors | Investing check-ins | R1 |
| Confirm a win | Named in a win | Win confirmations | R2 |
| "Did anything come of it?" | 60 days after an introduction; 14 days after a gathering | Win prompts | R2 |
| Overdue requests digest (admins) | Weekly, if any are overdue | Always | R1 |

---

## 7. Limits and timings

| Item | Value | Status |
|---|---|---|
| Request form submissions | 5 per IP per hour; 3 per email per day | New |
| Re-request after a decline | 90 days | New (replaces "re-apply after rejection") |
| Request answer promise / overdue | 21 days | New |
| Invitation expiry / reminder | 14 days / day 7 | Existing / New |
| Connection requests | 20 per rolling 24 hours | Existing |
| Connection request expiry | 30 days | Existing |
| Messages | No daily limit; max 20 in a row without a reply | Existing |
| Message length | 5,000 characters | Existing |
| Open introduction requests | 5 per member; 1 per target; 1 per introducer–target pair per 90 days | New |
| Introduction notes | To B ≤ 1,000; to C ≤ 500; B's note ≤ 500 | New |
| Introducer / target response window | 14 days each | New |
| Seat request note | ≤ 300 characters | New |
| Late seat cancellation | within 24 hours of start | New |
| "People you met" direct connect | 30 days after the gathering | New |
| Photo upload | JPEG / PNG / WebP, ≤ 5 MB; stored at 512 px and 128 px | New |
| Investor status confirmation | Every 90 days; unconfirmed after 120 | New |
| Wins (R2) | 20 per member per month; story ≤ 500 | New |
| Showcase (R2) | Up to 6 members; quotes ≤ 280 | New |
| Public number thresholds | Members 50, countries 5, introductions 25, gatherings 3, wins 10 | New |
| Recommendations | Up to 20; empty-state nudge below 5; dismiss for 30 days | Existing |
| Session length; login throttle | 30 days; 5 per email+IP / 15 min, 50 per hour per account | Existing |
| Password reset link | 1 hour | Existing |
| CSV import | 1 MB / 2,000 rows | Existing |
| Prospect archiving | 2 years after closing (never do-not-contact) | Existing |

---

## 8. Data model changes

**New entities**
- **InvitationRequest:** the prospect it belongs to, a snapshot of the form answers, consent time, received-while-closed (R2), when the 21-day clock starts, status (Open, Invited, Declined, Spam, Merged), decision time, decided by, note.
- **RequestVote (R2):** request, admin, Approve or Decline, note, time. One per admin per request.
- **Introduction:** requester, introducer, target, note to introducer, note to target, introducer's note, status (Asked, Forwarded, Accepted, Declined by introducer, Declined by target, Expired, Cancelled), deadlines, timestamps.
- **Gathering:** title, type, description, start (UTC) plus IANA time zone, duration, city, country, online flag, venue / link (private), capacity, audience (all / roles / invite-only), seat mode, requests-close time, show-on-public-site flag, status (Scheduled, Cancelled), created by.
- **GatheringHost** and **GatheringInvite** (for invite-only gatherings).
- **SeatRequest:** gathering, member, note, status (Requested, Confirmed, Waitlisted, Declined, Cancelled), late-cancel flag, attendance (Attended, No-show, unset).
- **MediaObject:** the stored photo (storage keys for each size, content type, created time).
- **Win and WinParticipant (R2),** **Testimonial (R2),** **SiteSetting (R2).**

**Changed entities**
- **User:** charter version and acceptance time, photo reference, "allow introduction requests", "prefer introductions", (R2) showcase opt-in.
- **Profile:** city (renamed from location), country, firm name, investor type, leads rounds, currently investing, investing confirmed at, last check (month), raise amount.
- **OutreachStatus:** add Requested; retire Applied; Approved shown as "Joined".
- **NotificationPreference:** introductions, gatherings near me, investing check-ins, (R2) win confirmations, win prompts.
- **Report reason:** add "Inappropriate photo".

---

## 9. API additions

*Public (no login):*
- `POST /api/invite-requests`: the request form.
- `GET /api/public/stats`: the numbers that have passed their thresholds.
- `GET /api/public/gatherings`: the public teaser.

*Joining:*
- `GET /api/invitations/:token`: the invitation preview (email, pre-filled name).
- `POST /api/join`: create the account from an invitation.
- `POST /api/me/charter`: accept the current charter version.

*Member:*
- **Photo:** `POST /api/me/photo` (upload), `DELETE /api/me/photo`, `GET /api/media/avatar/:id/:size` (access-checked).
- **Capital:** `GET /api/capital/investors`, `GET /api/capital/founders`, and `POST /api/me/investing-status` (confirm Yes or Paused).
- **Introductions:**
  - `GET /api/members/:id/mutuals`
  - `POST /api/introductions` (ask)
  - `GET /api/introductions?tab=asked|for-me|mine`
  - `POST /api/introductions/:id/introduce`, `/:id/pass`, `/:id/accept`, `/:id/decline`, `DELETE /api/introductions/:id` (cancel)
- **Gatherings:**
  - `GET /api/gatherings`, `GET /api/gatherings/:id`
  - `POST /api/gatherings/:id/seat` (request or take), `DELETE /api/gatherings/:id/seat` (cancel)
  - `GET /api/gatherings/:id/attendees` (confirmed only)
  - `GET /api/gatherings/:id/calendar.ics`
  - `GET /api/gatherings/:id/people-you-met`
- **Settings:** the preferences endpoint gains the new toggles, plus `PATCH /api/me/introduction-settings`.
- **(R2) Wins:** `POST/GET /api/wins`, `POST /api/wins/:id/confirm` | `/decline`.
- **(R2) Showcase:** `PATCH /api/me/showcase`, `POST /api/me/quote`.

*Admin:*
- **Requests:** `GET /api/admin/requests`, `POST /api/admin/requests/:id/invite` | `/decline` | `/spam`, and (R2) `POST /api/admin/requests/:id/vote`.
- **Gatherings:**
  - `GET/POST /api/admin/gatherings`, `PATCH /api/admin/gatherings/:id`
  - `POST /api/admin/gatherings/:id/cancel`
  - `GET /api/admin/gatherings/:id/requests`, `POST /api/admin/seats/:id/confirm` | `/waitlist` | `/decline`
  - `POST /api/admin/gatherings/:id/attendance`, `POST /api/admin/gatherings/:id/message`
- **Photos:** `DELETE /api/admin/members/:id/photo`.
- **(R2) Settings:** `GET/PATCH /api/admin/settings`.

*Scheduled jobs (added to the existing ones):*
- **daily:** invitation reminders, introduction expiry, investing check-ins, gathering reminders, (R2) win prompts.
- **weekly:** the overdue-requests digest.

*Removed:* `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, and the admin Applications endpoints.

---

## 10. Non-functional requirements

- **Security:** everything existing stays:
  - access checks on every action;
  - exact-origin checks on API writes;
  - a strict content security policy;
  - database sessions;
  - login throttling.

  **New:**
  - the public form has a honeypot and rate limits;
  - uploads are validated by file content, size-capped and re-encoded;
  - photos are served only through our own access-checked address;
  - private gathering details (venue, link, attendees) are never sent to anyone who isn't confirmed.
- **Privacy:**
  - consent is recorded on the request form;
  - photo metadata is stripped;
  - public content is opt-in only;
  - aggregates are shown only above thresholds;
  - data export covers the new features;
  - deletion covers the new features (F19).
- **Legal before launch (client's responsibility):** privacy policy, terms, final charter text, and consent wording on the request form. We ship placeholders that are clearly marked.
- **Storage:** photos need S3-compatible object storage (for example Vercel Blob, Cloudflare R2 or Amazon S3), set through environment variables. Local development uses the disk.
- **Time zones:** gatherings are stored in UTC with their own time zone, and displayed in the gathering's local time (online sessions also show the viewer's time). Follow-up dates stay date-only, in the platform's time zone.
- **Accessibility and responsiveness:** unchanged. WCAG 2.1 AA, 44 px touch targets, keyboard-reachable everything, works from 320 px wide. New screens follow the same rules: no hover-only actions, and calendar downloads have a text alternative.
- **Performance targets** (95th percentile with 10,000 active members): search and Capital views under 2 seconds, profile view under 2 seconds, message delivery under 5 seconds while the conversation is open.

---

## 11. Release plan and build order

**R1, built step by step.** Each step ends with typecheck, lint, automated tests, a browser walkthrough and a commit, as before.

| Step | Scope | Features |
|---|---|---|
| 1 | Profile foundations: city + country, investor and founder fields, photos (storage, upload, crop, metadata stripping, access-checked serving), new completeness formula, migration | F6, F7, F8 (country filters) |
| 2 | The front door: request form and all its matching rules, acknowledgement email, Requests queue (invite, decline, spam, overdue), invitation-only joining with charter acceptance, invitation reminders, status changes (Requested, Joined, Applied retired), self-registration removed | F2, F3, F4, F20, F21 (R1), F5 |
| 3 | Capital view and recommendation changes; "Raising now" and "Currently investing" filters; investor check-ins | F9, F10, F8 |
| 4 | Warm introductions and "Prefer introductions" | F11, F12, F13 (introduction note) |
| 5 | Gatherings: member side and admin side, reminders, "People you met" | F14, F23 |
| 6 | Home and dashboard updates; public website (Home, stats, gatherings teaser, charter, legal placeholders); designer brief updated | F1, F18, F24, F19 |

**R2 (next):**
- Wins (F15);
- review rules: votes, waitlist switch (F21);
- public showcase and quotes (F16);
- site settings (F26);
- the R2 dashboard tiles.

---

## 12. Removed, retired and out of scope

**Removed or retired in R3**
- **Public self-registration** (`/register` applications). Replaced by the request form and invitations.
- **The pending and rejected applicant account states** and **email confirmation for applicants.** Existing pending applicants are moved into the Requests queue at migration, and their unused accounts are removed. Existing rejected applicants become "Not a fit" prospects.
- **The admin "Applications" page.** Replaced by Requests.
- **Outreach status "Applied"** (now "Requested"). "Approved" is now labelled "Joined".
- **The single free-text "location" field** (now city + country).

**Out of scope (not planned)**
- Paid membership, fees, renewals or paid gatherings.
- **Deal flow** (founders sharing rounds and diligence notes). It needs legal review first.
- **Cohort program tools** (like the reference page's "The Season"). Run cohorts offline with Gatherings first.
- An index of funds and angels who aren't members.
- Native mobile apps, message attachments, video calls, group chats.

---

## 13. Open questions and suggestions for you

**Needs your confirmation**
1. **Visual direction.** Do you want the designer to start from the reference page's look? That means a warm off-white background, near-black text and a deep red-brown accent, an elegant serif for headings with a clean sans-serif for text, sharp corners, and candid photography. I recommend yes, adapted to the Women Builders name.
2. **Legal texts.** Who writes the privacy policy, terms and final charter: you, the client, or a lawyer? Launch shouldn't happen without them.
3. **Photo storage.** Which provider? If the app will be hosted on Vercel, I recommend Vercel Blob; otherwise Cloudflare R2. It only changes configuration.

**Suggestions not yet agreed.** Say yes or no to each.
4. **"Ask the team" introductions (R2).** When a member wants to reach someone and has no mutual connection, she can ask the Women Builders team to make the introduction. At most 2 per month, handled in an admin queue. This matters most for new members trying to reach investors who prefer introductions.
5. **Member reviewers (R2).** The reference page says "every application is read by two members." This would let admins mark trusted members as reviewers who can vote on requests (but see nothing else in the admin area).
6. **"Open to" on profiles (R1, small).** Tags such as advising, hiring, being hired, co-founding, investing, freelance or project work, mentoring and speaking, with a filter in Discover. This gives operators and builders the same kind of clear signal that "Raising now" and "Currently investing" give founders and investors, which supports the equal-roles decision.
7. **Member numbers.** A sequential "Member no." shown on the profile, as on the reference page. It's a small touch of belonging. I'd skip it unless you like it.
