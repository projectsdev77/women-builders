# Women Builders: Designer Handoff (Revision 3)

**This document is the complete brief for designing the Women Builders web platform.** It covers:
- what the product is and who it serves;
- every screen and state;
- every rule the UI must respect.

You shouldn't need anything else, but questions are welcome (section 15).

> **Update:** the designer's visual guide (Homepage v2, Member App v2, Member Card v2, Account v2, Design System) is now implemented across the app. Admin, edit profile, settings, onboarding, error pages and emails follow the same system using the legacy-r2 admin shell. The screenshots in `docs/handoff-screens/` show the earlier placeholder UI.

The platform is **built and working**, with placeholder styling. Your job is the visual and interaction design; everything listed here already exists and behaves as described. Screenshots of the current placeholder UI are in `docs/handoff-screens/`. **Treat them as wireframes showing content and structure, not as a style to follow.**

**What changed since the previous handoff (R2):**
- **Joining is by invitation only.** Self-registration, email confirmation and the "application under review" page are gone. They are replaced by a public **Request an invitation** form, an admin **requests queue**, and an invitation-only **Join** page.
- **New features:**
  - a **community charter**;
  - **profile photos**;
  - **city and country**;
  - an **"Open to"** field;
  - richer **investor and founder** fields;
  - the **Capital view**;
  - **warm introductions**, including "Ask the team";
  - **gatherings** (dinners and working sessions) with "People you met";
  - a full **public homepage**.
- **New admin areas:** requests, introduction requests and gatherings. The admin dashboard has new tiles.
- **Second-release features, now also built:**
  - **review votes** and **member reviewers**;
  - an **applications open / waitlist** switch;
  - **site settings**;
  - **Wins**;
  - the opt-in **public showcase and quotes**.

---

## Contents
1. [The product in one page](#1-the-product-in-one-page)
2. [Who uses it](#2-who-uses-it)
3. [Design principles](#3-design-principles)
4. [What we need from you](#4-what-we-need-from-you-deliverables)
5. [Site map and navigation](#5-site-map-and-navigation)
6. [Core concepts the UI must express](#6-core-concepts-the-ui-must-express)
7. [Screens: public website and account](#7-screens-public-website-and-account)
8. [Screens: member area](#8-screens-member-area)
9. [Screens: admin area](#9-screens-admin-area)
10. [Emails](#10-emails)
11. [Components inventory](#11-components-inventory)
12. [Content, data and limits reference](#12-content-data-and-limits-reference)
13. [Accessibility, responsive and technical constraints](#13-accessibility-responsive-and-technical-constraints)
14. [Voice and copy](#14-voice-and-copy)
15. [Open design questions](#15-open-design-questions)
16. [Glossary](#16-glossary)

---

## 1. The product in one page

**Women Builders is a curated, invitation-only network** for women who are **founders, operators, investors and builders**. It helps them *find the right people and actually meet them*. That might be the investor who backs your stage, the operator who has scaled what you're scaling, or the engineer who wants to advise.

The core loop:

1. **Request an invitation.** A visitor fills in a short form on the public site. The team reads every request and answers within three weeks, either way. The team also invites people directly.
2. **Join.** An invitation link opens a short Join page: password, role, headline, location, and accepting the charter.
3. **Build a profile.** Photo, what she does, what she's working on, **what she needs**, **what she can offer**, and what she's **open to**.
4. **Discover.** Three ways in:
   - recommendations with a plain-language reason ("Investing at your stage", "2 mutual connections can introduce you");
   - the **Discover** directory;
   - the **Capital** view of active investors and founders who are raising.
5. **Connect.** Three routes:
   - a direct connection request;
   - a **warm introduction** through a mutual connection (or through the team);
   - meeting at a **gathering**.
6. **Talk and meet.** Connected members message each other, and members meet at small dinners and working sessions.

A separate **admin area** lets the team:
- answer invitation requests;
- run outreach to prospective members (a lightweight CRM);
- send invitations;
- run gatherings;
- handle "Ask the team" introductions;
- handle safety reports;
- watch community health.

**What makes it different from LinkedIn:**
- small and curated;
- matches on *needs and offers* rather than job titles;
- private by default;
- introductions are warm and every "no" is silent;
- the network becomes real at in-person gatherings.

The tone should feel **warm, trustworthy, ambitious and calm**, never like a noisy social feed.

**Platform:** a responsive web app. There are no native apps, but it must work beautifully on phones.

---

## 2. Who uses it

### Member roles
Every member has **one primary role** and **up to three other roles**. A founder who also angel-invests is Founder (primary) plus Investor. **All four roles are equally important.** Don't design a hierarchy, a premium tier, or a "special" color for any role. The Capital view is a lens on the directory, not a separate club.

| Role | Who | Typically needs | Typically offers |
|---|---|---|---|
| **Founder** | Started or starting a company | Investors, hires, operators' advice, co-founders | Domain expertise, market access, peer support |
| **Operator** | Runs a function inside a company | Peers, career moves, mentorship | Functional expertise (hiring, GTM, finance…) |
| **Investor** | Angel, VC, family office, syndicate lead | Deal flow | Capital, fundraising advice, intros |
| **Builder** | Engineer, designer, maker | Projects, collaborators, advisory roles | Technical and product skills |

### Personas to design for
- **Adaeze, founder (pre-seed, Lagos).** Raising her first round. Checks the app on her phone between meetings. She wants investors who are *actually investing at her stage*, and warm introductions to them.
- **Divya, VC partner (San Francisco).** Busy. She turns on **"Prefer introductions"** so strangers can't cold-request her. She scans the introductions she's asked to make and answers quickly.
- **Mei, staff ML engineer (Toronto).** A private person. She hides her location and some details from strangers. She's open to advising and goes to an online working session on AI tooling.
- **Grace, community admin.** On a laptop, she:
  - answers invitation requests within the three-week promise;
  - runs outreach;
  - curates the guest list for a 12-seat dinner.

  Needs dense, efficient screens.

### Account states (the UI differs for each)
| State | What the person sees |
|---|---|
| **Visitor** (logged out) | Public homepage, charter, request form, log in, privacy and terms |
| **Invited** (has a link) | The Join page. An expired or used link shows a friendly "request a new one" screen |
| **Active member** | The member area |
| **Active member with an incomplete profile** | Everything, but *sending connection requests and asking for introductions* is locked until the profile is complete enough (6.3) |
| **Member whose charter is out of date** | A full-page "We've updated our community charter" interstitial until she accepts, with the option to export, deactivate or delete instead |
| **Deactivated (self)** | Login offers "Reactivate my account" |
| **Deactivated (by admin)** | Login shows "deactivated by the team, contact us" |
| **Deleted account** | The person is gone. Others see **"Deleted account"** with a ghost avatar in old conversations (6.6) |
| **Admin** | The admin area. An admin may also be a member with a profile, and then has a "Member view" / "Admin" switch |

---

## 3. Design principles

1. **People first, not feeds.** No timeline, no likes, no follower counts. Every screen is about *specific people and why they matter to you*.
2. **Explain every match.** Recommendations always show *why*. Make reasons prominent and scannable.
3. **Warm routes, silent no's.** Introductions, declines and passes never announce a "no". The UI must never hint at one (6.1, 6.7).
4. **Safety is visible but calm.** Block and Report are always reachable but tucked into "More". Hidden details show a gentle lock notice.
5. **Needs and offers are the heart of the profile.** Give them visual weight; they drive matching.
6. **Curated means considered.** Generous whitespace, fewer and better elements, confident typography. It should feel like a private club, not a job board.
7. **Equal roles.** The four roles are peers in every list, card and color choice.
8. **Admin screens are tools.** Dense, fast, keyboard-friendly, table-heavy. Members never see them.
9. **Inclusive by default.** WCAG 2.1 AA, 44×44px touch targets, never information by color alone.

---

## 4. What we need from you (deliverables)

1. **A visual design system:**
   - color tokens (light, and optionally dark), type scale, spacing, radii, elevation;
   - iconography style;
   - **avatar treatment with photos** (we now have photos, with initials as the fallback and a ghost avatar for deleted accounts);
   - component specs for everything in section 11.
2. **High-fidelity designs** for every screen in sections 7–9, at **mobile (390px)** and **desktop (1280px)**.
3. **All states** listed per screen: empty, loading, error, disabled, and permission variants.
4. **Mobile navigation pattern.** The member nav now has 11 destinations (section 5) and wraps on phones. We suggest:
   - a bottom tab bar: Home, Discover, Gatherings, Messages, and a "More" sheet;
   - Capital, Introductions, Connections, For you, Profile and Settings in the sheet, with badges.

   It's your call.
5. **The public homepage** (7.1): this is now a real marketing page. Please give it the most brand care.
6. **Email template:** one responsive layout for all the emails in section 10.
7. **Brand touches:** logo/wordmark (currently plain text), favicon, Open Graph image.
8. **Prototype links or annotations** for key interactions:
   - request an invitation;
   - join;
   - ask for an introduction, then introduce, then accept;
   - request a seat at a gathering;
   - the admin seat queue;
   - messaging.

Our frontend uses **Tailwind CSS**, so tokens expressed as a Tailwind theme are easiest, but any clear format works.

---

## 5. Site map and navigation

```
PUBLIC
  /                         Homepage (logged-in members are sent to Home)
  /charter                  Community charter
  /request-invite           Request an invitation (the form is also at the bottom of the homepage)
  /join?invite=…            Join with an invitation (invited people only)
  /privacy, /terms          Placeholders until the client's text arrives
  /login                    Log in
  /forgot-password          Request reset link
  /reset-password?token=    Choose a new password
  /unsubscribed             One-click email unsubscribe confirmation
  /onboarding               4-step profile wizard (right after joining)
  /charter/accept           Interstitial when the charter changes

MEMBER AREA (main nav, in this order)
  /dashboard                Home
  /search                   Discover
  /capital                  Capital (tabs: Investors, Founders raising)
  /gatherings               Gatherings (tabs: Upcoming, My gatherings)
    /gatherings/[id]        Gathering detail
  /recommendations          For you
  /connections              Connections
    /connections/requests   Requests (received and sent)
  /introductions            Introductions (tabs: Asked of me, For me, My requests)
  /messages                 Inbox
    /messages/[memberId]    Conversation
  /profile                  My profile (as others see it)
    /profile/edit           Edit profile
  /settings                 Settings
  /members/[id]             Another member's profile

ADMIN AREA (side nav, in this order)
  /admin                    Dashboard
  /admin/requests           Invitation requests (tabs: Open, Invited, Declined, Spam, All)
  /admin/members            All accounts
    /admin/members/[id]     Account detail and actions
  /admin/prospects          Potential members (outreach CRM)
    /admin/prospects/[id]   Prospect workspace
    /admin/prospects/import CSV import
  /admin/follow-ups         Follow-up queue
  /admin/gatherings         Gatherings (Upcoming / Past)
    /admin/gatherings/new   Create
    /admin/gatherings/[id]  Seat queue, attendance, message guests, edit, cancel
  /admin/invitations        Invitations
  /admin/introductions      "Ask the team" introduction requests
  /admin/reports            Safety reports
  /admin/audit              Audit log
```

**Member nav badges** (refreshed every 30 seconds):
- **Messages:** unread count.
- **Introductions:** the number waiting for her answer, as introducer or as the person being introduced.

**Admin nav badges:**
- **Requests:** open requests. The badge turns **red** when any is past the 21-day promise.
- **Follow-ups:** due today or overdue.
- **Introduction requests:** team requests waiting.
- **Reports:** open reports.

---

## 6. Core concepts the UI must express

### 6.1 Connection status (between the viewer and another member)

| Status | Shown as | Primary action | Secondary |
|---|---|---|---|
| `none` | Nothing, or "Connect" | **Connect** (note dialog) | Ask for an introduction (if mutuals) |
| `none` + she **prefers introductions** | "Prefers introductions" tag | **Ask for an introduction** (if mutuals), else **Ask the Women Builders team to introduce you** | — |
| `pending_sent` | "Request pending" | Withdraw request | — |
| `pending_received` | "Wants to connect" + their note | **Accept** | Decline ("they won't be notified") |
| `connected` | "Connected" | **Message** | Remove connection |

**Rules for the profile actions:**
- If they **met at a gathering** in the last 30 days, Connect is available even when she prefers introductions. The note is pre-filled "We met at <gathering>".
- Always available in a "More" menu: **Report** and **Block**.

> **Silent decline.** When someone declines, the sender keeps seeing "Request pending" until the request expires (30 days). Never design any UI that hints at a decline.

### 6.2 Privacy: hidden fields
Members can mark these fields **"only connections see"**:
- location (city and country together)
- professional background
- current focus
- what I need
- what I can offer
- company name
- funding status
- raise amount
- check size
- LinkedIn
- website

**Always visible to every member:**
- name, photo, headline, roles, expertise, "Open to";
- investor type, firm, stages, sectors, leads/follows, investing status, last check.

**Email is never shown** to other members.

When a stranger views a profile with hidden fields, those sections don't appear, and one calm notice does: *"🔒 Mei shares some details only with connections."*

**Filters never reveal hidden data.** A founder who hides her funding status doesn't appear in "Founders raising" for non-connections. An investor who hides her check size isn't matched by "I'm raising checks of $X" for them.

### 6.3 Profile completeness gate
- **Score:** 0–100%.
  - 8 core fields: headline, **photo**, background, expertise, current focus, needs, offerings, **country**.
  - Plus 3–4 role fields **for every role held**:
    - **Founder:** company, stage, industry, funding status.
    - **Operator:** function, seniority, focus areas.
    - **Investor:** investor type, stages, check size, sectors.
    - **Builder:** skills, project types, collaboration interests.
- **Unlocking:** at **≥60%, with the primary role's required fields filled**, she can **send connection requests and ask for introductions**. The required fields:
  - **Founder:** company name, stage.
  - **Operator:** function, seniority.
  - **Investor:** stages, check size.
  - **Builder:** skills.
- **What stays open:** everything else — browsing, accepting requests, messaging, gatherings.
- **Where the score shows:** as a meter with a list of what's missing, on Home, My profile, the editor (sticky) and onboarding.
- **The gate:** disabled Connect / Ask buttons with "Complete your profile to connect or ask for introductions".

### 6.4 Recommendations and reasons
Each recommendation shows up to three **reasons**. Design an icon + text treatment for each type:

| Type | Example copy |
|---|---|
| Needs → offers | "Can help with what you need: fintech, investor, intros" |
| Offers → needs | "Looking for what you offer: design, partner" |
| Stage fit (founder ↔ investor) | "Investing at your stage" / "Raising at a stage you invest in" |
| Role fit | "Operator: a natural fit for your work as a founder" / "Fellow founder" |
| Shared expertise | "Shared expertise: payments, fintech" |
| Mutual connections | "2 mutual connections can introduce you" |
| Same gathering | "Going to the same gathering: Lagos founders table" |
| Same city | "Also in Lagos" |

**Behavior:**
- "Not now" hides a recommendation for 30 days.
- Up to 20 recommendations are shown. With fewer than 5, show a gentle nudge to improve the profile.
- Members who prefer introductions can still be recommended; their card action becomes **Ask for an introduction**.

### 6.5 Limits (design the "hit the limit" states)
| Limit | Value | Message |
|---|---|---|
| Connection requests | 20 per rolling 24h | "You've sent 20 connection requests in the last 24 hours. Please try again later." |
| Unanswered messages in one conversation | 20 in a row | "You've sent 20 messages without a reply. Wait for Divya to respond." |
| Withdrawn request cooldown | until the original expiry | "You withdrew a request to this member recently. You can send a new one after October 28." |
| Open introduction requests | 5 per member, 1 per person, 1 per introducer–person pair per 90 days | "You can have 5 introduction requests open at a time." |
| "Ask the team" | 2 per calendar month | "You can ask the team for 2 introductions a month." |
| Invitation requests (public) | 5 per network per hour | "Too many requests from your network. Please try again in an hour." |

### 6.6 Read-only conversations
A conversation becomes read-only (history visible, composer replaced by a notice) when:
- **the connection was removed:** *"This connection was removed. The conversation is read-only."*
- **the other member isn't active:** *"This member is no longer active. The conversation is read-only."*
- **the other person deleted their account:** *"This account was deleted. You can still read your conversation, but it is read-only."*
  - The name shows as **"Deleted account"** with a neutral **ghost avatar**: no photo, no initials, no link.
  - Design this as a calm treatment, distinct from both a normal member and a blocked one.

A **blocked** member's conversation disappears entirely for both people.

**Conversations that began with an introduction** open with an **introduction note**: "Introduced by Mei Chen", the introducer's note, and "Adaeze wrote: …". It's a distinct, centered card above the first message.

### 6.7 Warm introductions (the three people)
- **The people:** **A** asks, **B** introduces (a mutual connection, or the team), **C** is the person A wants to meet.
- **The flow:** A picks B from "*N* of your connections know C" and writes:
  - a note to B (≤1,000 characters);
  - an optional note for C (≤500).

  Then:
  1. B has 14 days to **Introduce** (with an optional note to C, ≤500) or answer **Not this time**.
  2. C has 14 days to **Accept** (they're connected and the conversation opens with the notes) or answer **Not now**.
- **What A sees:**
  - "Waiting for B";
  - "B introduced you, waiting for a reply";
  - "Connected";
  - after a deadline passes with no success, "No introduction was made".
- **Every "no" is silent.** A's status doesn't change when B passes or C declines; it changes only when the time runs out.
- **"Ask the team"** appears **only when nobody in her network can introduce her**. The person then sees "The Women Builders team would like to introduce you to…".
- **Report** is available from every introduction.

### 6.8 Gatherings
- **Types:** Dinner (a "table", default 12 seats) and Working session (a "room", default 20 seats), in person or online.
- **Seat modes:**
  - **Curated:** "Request a seat", and the team confirms.
  - **Open:** "Take a seat", first come, first served, with an automatic waitlist.
- **Seat statuses:** *Requested*, *Confirmed*, *Waitlisted*, *Not this time*, *Cancelled*. Design a calm badge for each.
- **The venue address or online link is shown only to confirmed guests and hosts.** Everyone else sees the city ("Lagos, Nigeria") or "Online".
- **Times** show in the gathering's local time zone ("Thu, Nov 12, 2026, 7:00 PM GMT+1"). Online sessions also show "Your time: …".
- **Cancelling within 24 hours** of the start is recorded as a late cancellation, and the dialog warns about it.
- **"People you met":** for 30 days after a gathering, attendees see the others with a one-tap **Connect**, pre-filled "We met at <title>". It works even with people who prefer introductions.
- **Safety:** two people who blocked each other never see each other in "Who's coming". Admins see a conflict flag.

### 6.9 Investors: "currently investing"
- **The status:** investors answer "Are you still investing?" every 90 days, from a card on Home and by email.
- **Badges:**
  - **Currently investing** (green);
  - **Paused**;
  - **Status not confirmed**, after 120 days without an answer.
- **Effect:** unconfirmed and paused investors drop out of the default Capital list.
- **Last check:** "Last check: Aug 2026" shows when she has filled it in.

---

## 7. Screens: public website and account

### 7.1 Homepage `/` (screenshot 01)
This is the public face of the brand. Sections, in order:
1. **Hero:** "Where women who build find each other", one sentence on what the network does, **Request an invitation** (primary, scrolls to the form) and **Log in**.
2. **Who it's for:** four equal cards (Founders, Operators, Investors, Builders), each with "You get" and "You bring".
3. **What membership gives you:** Warm introductions, The Capital view, Gatherings, Matching on needs and offers.
4. **How joining works:** Request, then our team reads it, then you hear back within three weeks either way, then join with your invitation. "One reply from a human, either way."
5. **Live numbers:** members, countries, introductions made, gatherings held.
   - Each number appears **only once it passes its threshold** (members 50, countries 5, introductions 25, gatherings 3).
   - Design the section for 1 to 4 numbers. It's hidden entirely when none qualify.
6. **Upcoming gatherings teaser:** only gatherings the team marks public. Shows type, title, city or "Online", and month; never the venue, exact date or guests. Hidden when empty.
7. **"Some of the members":**
   - up to 6 **featured members**, who opted in and were picked by the team, in the team's order: photo, name, headline, role, city (no city if she hides her location);
   - **approved quotes**: "…", with name and role.

   The section is hidden when empty.
8. **Request an invitation:** the form (7.3).
9. **Footer:** charter, privacy, terms, contact email, log in.

**Flash messages:** "Your account has been deleted." / "Your account is deactivated. Log in any time to reactivate it."

**Content rules:** no invented numbers, logos or quotes. No member data appears publicly.

### 7.2 Community charter `/charter`
- **Structure:** a readable long-form page with an intro and short titled sections of bullet points. Shows "Version 1, updated 2026-10-06".
- **Copy status:** the text is a **placeholder draft** for the client to finalize; design for roughly the current length.
- **Interstitial** `/charter/accept`: shown when the charter changes.
  - Title: "We've updated our community charter".
  - The full charter, then **I accept the charter**.
  - A disclosure, "I don't accept. What are my options?", revealing download data, deactivate and delete.

### 7.3 Request an invitation `/request-invite` (screenshot 02)
- **Fields:**
  - full name;
  - email;
  - primary role (4 options);
  - LinkedIn profile (optional, "helps us review faster");
  - city;
  - country (list);
  - "What are you building or working on?" (20–1,000 characters);
  - "Who referred you?" (optional);
  - a consent checkbox: "I agree that Women Builders may store these details to review my request. See the privacy policy."
- **Footnote:** "No newsletter, no spam. One reply from a human, either way."
- **After submit:** the same calm thank-you for everyone. By design it never reveals whether the person is already known, a member or declined: "Thank you. We've received your request. You'll hear back from us within three weeks, either way." The email confirms it.
- **Errors:** inline per field, plus the rate-limit message.

**Waitlist variant** (applications closed in Site settings):
- the title and button read **"Join the waitlist"**, with a yellow note: "We review requests in rounds and are not reviewing right now. Next review: March.";
- the thank-you and email say she's on the waitlist.

The homepage form changes the same way.

### 7.4 Join `/join?invite=…` (screenshot 03)
- **Title:** "Welcome to Women Builders" — "You were invited, so your account is active as soon as you finish this page."
- **Fields:**
  - email (read-only, from the invitation);
  - full name (pre-filled from her request);
  - password, with the rule hint: 8+ characters, an uppercase letter, a lowercase letter and a number;
  - primary role;
  - headline (≤120);
  - city;
  - country;
  - **"I've read and accept the community charter"** (link opens the charter).
- **Button:** "Join Women Builders", then onboarding.
- **No link or a bad link:** "Women Builders is invitation-only" / "This invitation has expired". Both have a "Request a new invitation" button. Links work once and expire after 14 days. A reminder email with a fresh link goes out after 7 days.

### 7.5 Log in `/login` (screenshot 04)
- **Content:** email, password, "Forgot password?", "Request an invitation".
- **Errors** (generic by design):
  - "Email or password is incorrect."
  - "Too many attempts. Try again in 15 minutes, or reset your password."
  - "This account has been deactivated by the Women Builders team. Contact us if you think this is a mistake."
- **Self-deactivated:** after a correct password, swap the form for "You deactivated your account…" with **Reactivate my account** and **Cancel**.

### 7.6 Forgot / reset password
- **Forgot:** always answers "If an account exists for x@y.com, we've sent a link… It expires in 1 hour."
- **Reset:** a new password, then back to login with a success banner.

### 7.7 Privacy and terms `/privacy`, `/terms`
Simple text pages. They currently show a clearly marked placeholder notice until the client supplies the text. Design a comfortable long-form legal text layout.

### 7.8 Onboarding wizard `/onboarding`
Four steps, with a progress indicator and a live completeness meter:
1. **The basics:** **photo upload**, name, headline, primary role, other roles, **city, country**, LinkedIn, website.
2. **Your roles:** a section per role held (fields in section 12).
3. **Expertise and focus:** expertise tags, **Open to** (multi-select chips), background, current focus.
4. **Needs and offerings + privacy + introductions:**
   - needs and offerings, with the tip "Be specific: 'intros to seed fintech investors' beats 'help'";
   - the privacy toggles;
   - an **Introductions** card with "Let members ask me for introductions" and **"Prefer introductions"**. Investors also see a short explanation suggesting it.
   - Buttons: **Finish** and **Skip for now**.

---

## 8. Screens: member area

### 8.1 Home `/dashboard` (screenshot 06)
In order:
1. **Prompts** (only when they apply):
   - profile completeness ("Your profile is 45% complete… Reach 60% to send connection requests");
   - **"Add your country…"** for older profiles;
   - for investors, the **"Are you still investing?"** card with **Yes, still investing** / **Paused for now**.
2. **To do:** a short list of links, shown only when there's something to do:
   - "3 connection requests waiting";
   - "1 introduction needs your answer";
   - "2 gathering seat updates".
3. **Three summary tiles:** connection requests, unread conversations, profile completeness.
4. **New messages:** up to 3 unread conversations.
5. **Your next gatherings** (confirmed or hosting) and **Gatherings near you** (her country or online). Up to 3 each, with title, local time and place.
6. **Recent wins:** up to 3 shared wins (11.32), with "Your wins" and **Share a win** links.
7. **Recommended for you:** the top 3 cards + "See all".

The To do list also includes "1 win names you: confirm it".

### 8.2 Discover `/search` (screenshot 07)
- **Filters** (a side panel on desktop; suggest a sheet on mobile):
  - keyword;
  - primary role;
  - "also holds role";
  - expertise;
  - **country** (list);
  - **city** (text);
  - **Open to** (multi);
  - **Capital:** "Investors currently writing checks" and "Founders raising now or soon".
- **Results:** a count and a grid of **member cards** (11.3), with photo, the top reason, a "Prefers introductions" tag, and "*N* mutual connections". 20 per page.
- **Empty states:** "No members match your search. Try fewer filters or a different keyword."

### 8.3 Capital `/capital` (screenshots 08, 09)
"A view of the same community, for raising and investing. Every role matters equally here, and Discover shows everyone." It has two tabs.

**Investors**
- **Filters:**
  - **"I'm raising checks of $___K"**;
  - stage;
  - sector;
  - investor type;
  - leads or follows;
  - country;
  - status (**Currently investing**, the default, or All investors).
- **Order:** confirmed in the last 90 days first, then most recent "last check", then relevance, then name.
- **Card:**
  - photo, name, headline, location;
  - firm · type · leads/follows;
  - stages;
  - check range (if visible);
  - sectors;
  - the investing badge;
  - "Last check: Aug 2026";
  - the top reason ("Investing at your stage");
  - **how to reach her** (below).

**Founders raising**
- **Filters:** company stage, industry, country, raise amount range ($K).
- **Order:** "Raising now" first, then "Raising in 6 months".
- **Card:**
  - photo, name, headline;
  - stage · industry;
  - funding status badge;
  - "Raising $1.5M" (if visible);
  - the top reason;
  - how to reach her.

**"How to reach her"** (card footer):

| Situation | Action |
|---|---|
| Connected | **Message** |
| Prefers introductions, with mutuals | **Ask for an introduction** |
| Prefers introductions, no mutuals | "Prefers introductions. No one in your network knows her yet." + "Ask the team" link |
| Otherwise | **View and connect**, plus "Ask for an introduction" if there are mutuals |
| Request sent / received | "Request sent" / **Respond to request** |

### 8.4 Gatherings `/gatherings` (screenshot 10) and detail `/gatherings/[id]` (screenshot 11)
**List**
- **Tabs:** Upcoming / My gatherings.
- **Filters:** type, city, online only.
- **Order:** her country first, then online, then others.
- **"People you met" panel** (when there are people from a recent gathering to connect with): photo, name, "At <title>", **Connect**.
- **Cards:**
  - type badge, her seat status badge, Cancelled / Past badges;
  - title;
  - local time;
  - place;
  - seats ("3 of 12 seats left", "Full · waitlist open", or "12 seats · request a seat");
  - hosts ("Hosted by The Women Builders team, Mei Chen").

**Detail**
- **Header:** type badge, seat status badge, "You're hosting" if she's a host.
- **Facts:**
  - **When:** local time, duration, and "Your time" for online sessions.
  - **Where:** the venue or link once confirmed; otherwise the city, with "The address is shared with confirmed guests."
  - **Seats.**
  - **Hosts.**
- **Description.**
- **Actions:**
  - **Request a seat** or **Take a seat**. The dialog has an optional note ≤300: "What would you bring, or want from it?" and a charter confidentiality reminder.
  - **Cancel my seat** / **Withdraw my request**, with a late-cancellation warning within 24 hours.
  - **Add to calendar** (`.ics`), once confirmed.
- **Messages after acting:**
  - "You're in. We've emailed you the details."
  - "It's full, so you're on the waitlist…"
  - "Request sent. We'll email you when the team has decided."
- **States to design:**
  - "Requests for this gathering have closed";
  - a cancelled banner with the reason;
  - declined: "We couldn't fit you at this one. We'd love to see you at the next."
- **Who's coming** (confirmed guests and hosts only): hosts, then attendees, with photo, name, role · headline.
- **People you met** (after the gathering): rows with **Connect**.

### 8.5 For you `/recommendations` (screenshot 12)
- **Cards:** up to 20 recommendation cards, each with up to 3 reasons (6.4), **View profile** and **Not now**.
- **Few or none:** a nudge or an empty state.

### 8.6 Member profile `/members/[id]` (screenshots 13, 14)
**Header**
- **photo** (large), name, headline, role badges;
- city, country · "Member since September 2026";
- LinkedIn / Website links;
- **"Open to" chips**.

**Actions column**
- **The actions:** the states from 6.1, plus the introduction actions:
  - "Ask for an introduction", with "1 of your connections knows Divya";
  - "Introduction requested" (links to My requests) once she has asked;
  - "Ask the Women Builders team to introduce you" when nobody can.
- **More options:** Report, Block.

**Main column**
- current focus;
- **Looking for** (needs);
- **Can help with** (offerings);
- background.

**Side column**
- **Expertise.**
- **A card per role held:**
  - **Founder:** company, stage, industry, funding status, **raise amount**.
  - **Operator:** function, seniority, focus areas.
  - **Investor:** **firm, investor type**, stages, check size, sectors, **leads/follows**, **investing badge**, **last check**.
  - **Builder:** skills, project types, collaboration interests.

**Dialogs**
- **Connect:** an optional note ≤500 with a counter. Pre-filled "We met at …" after a shared gathering.
- **Ask for an introduction:**
  - radio cards for each possible introducer (photo, name, headline);
  - "Your note to Mei *" (≤1,000), "Only Mei sees this.";
  - "A note for Divya (optional)" (≤500), "Forwarded only if Mei makes the introduction.";
  - the reassurance: "If nobody can make the introduction, you'll see 'No introduction was made' after 14 days. Nobody is told who said no."
- **Ask the team:** the same dialog with "the team" as the introducer, and how many team asks she has left this month.
- **Also:** Remove connection, Block, and Report (with the reasons: harassment, spam, fake profile, inappropriate content, **inappropriate photo**, something else; the dialog links to the charter).

### 8.7 My profile `/profile` and Edit profile `/profile/edit` (screenshot 15)
- **Layout:** one long form with a **sticky completeness meter**.
- **Photo uploader:**
  - JPEG, PNG or WebP up to 5 MB;
  - the server crops it square around the most interesting part, so there's no manual crop step;
  - Replace / Remove;
  - a hint that location data is removed from photos.
- **Sections:** Basics (with city and country), About your roles (with the new investor and founder fields), Expertise and focus (with Open to), Needs and offerings, Privacy.
- **Tag inputs:** chips; Enter or comma adds, Backspace removes.

### 8.8 Connections `/connections` and Requests `/connections/requests` (screenshots 16, 17)
Unchanged:
- **Connections:** search and a grid of cards with **Message**.
- **Requests:** received cards with the note, Accept / Decline; sent cards with Withdraw.

### 8.9 Introductions `/introductions` (screenshot 18)
"Warm introductions through people who know you both. Nobody is ever told who said no." Three tabs; pending items come first.
- **Asked of me** (she's the introducer):
  - "Adaeze would like to meet Divya";
  - both people (photo, name, headline);
  - Adaeze's note to her;
  - the note for Divya (forwarded if she introduces);
  - an "Answer by Oct 20" badge;
  - **Introduce** (dialog with an optional note ≤500), **Not this time**, Report.
  - Past items: "You introduced them" / "You passed" / "Expired".
- **For me** (she's being introduced):
  - "Mei Chen would like to introduce you to Adaeze Nwosu";
  - the person;
  - "From Mei" and "From Adaeze" notes;
  - "Answer by…";
  - **Accept**, **Not now**, Report.
  - After accepting: "Open your conversation".
- **My requests** (she asked):
  - "To meet Divya via Mei", with the status badge (6.7) and "Asked Oct 6";
  - **Withdraw request** while waiting;
  - "Open your conversation" once connected.
- **Empty states**, one per tab. "My requests" links to Discover and Capital.

### 8.10 Inbox `/messages` and Conversation `/messages/[memberId]` (screenshots 19, 20)
- **Inbox:** as before, now with photos and the ghost avatar for deleted accounts.
- **Conversation:**
  - the **introduction note** card at the top when relevant (6.6);
  - optimistic sending ("Sending…", "Failed. Retry");
  - new messages appear within ~3 seconds;
  - Enter sends, Shift+Enter adds a new line, 5,000 characters max;
  - read-only states (6.6);
  - per-message Report (please design a mobile-friendly affordance).

### 8.11 Settings `/settings` (screenshot 21)
1. **Email notifications** (toggles, saved instantly):
   - connection requests;
   - accepted requests;
   - new messages;
   - **introductions**;
   - **gatherings near me**;
   - **investing check-ins** (investors only);
   - **win confirmations**;
   - **win prompts**.

   Note: "Account and security emails, and emails about your own seats, are always sent."
2. **Introductions:**
   - "Let members ask me for introductions" (on by default);
   - **"Prefer introductions"** (off by default; explains that requests already pending aren't affected).
3. **Password.**
4. **Blocked members.**
5. **Public website:**
   - **"Feature me on the public website"** (off by default; switching it off removes her immediately), with a "You're featured right now" badge when picked;
   - a **quote** box (10–280 characters), with "The team approves quotes before they appear";
   - her quotes with a status (*Waiting for approval* / *On the website* / *Not used*) and Withdraw.
6. **Your account and data:**
   - **Download your data:** JSON, now including introductions, gathering history, wins and quotes.
   - **Deactivate.**
   - **Delete account** (Telegram style):
     - her name, email, profile, photo, connections and requests are erased;
     - **her conversations stay readable for the other person** as "Deleted account";
     - upcoming seats are released.

### 8.12 Wins `/wins` and Share a win `/wins/new` (screenshots 23, 24)
A win is something that came of the network. There is **no feed**: wins appear on profiles, in Home's "Recent wins", and here.
- **`/wins`:**
  - **Waiting for you to confirm:** win cards with "Ada named you. Is this right?", **Yes, confirm** / **That's not right**. Declining is silent.
  - **Wins you shared:** cards with the visibility ("Counted anonymously" / "Members can see it" / "May be quoted on the public site"), the **private amount** ("amount $300K (private, team totals only)"), "waiting for confirmation", and Delete.
- **Share a win form:**
  - **what happened:** chips for Investment, Hire, Advisor or mentor, Customer or partnership, Co-founder, Speaking or press, Other;
  - **with whom:** a member search with chips, plus "Someone outside the network was involved";
  - **how it happened:** an introduction (pick which), a connection, a gathering (pick which), or other;
  - **month** (not in the future);
  - **amount in $K** (investments only, always private);
  - **story** (≤500);
  - **who can see it:** three radio options with explanations; **anonymous is the default**.
- **Entry points:** Home, accepted introductions ("Share a win"), past gatherings ("Share a win from this gathering"), and a connection's profile ("Share a win with Divya"). Each pre-fills the form.
- **Win card** (11.32): type badge, month, **Verified** badge once a named member confirmed, "from <gathering>" / "from an introduction", the author with confirmed participants ("Adaeze Nwosu with Divya Iyer"), and the story.
- **Profiles:** a "Wins" section under the profile, with shared wins she logged or confirmed.
- **Prompts:** "Did anything come of meeting Cleo?" 60 days after an introduction, and "Did anything come of <gathering>?" 14 days after a gathering, by email, once each.

### 8.13 Global states
- **404:** "We couldn't find that page". Also used for unavailable profiles, gatherings she can't see, and blocked members.
- **Error:** "Something went wrong… mention reference 1a2b3c4d." + Try again.
- **Network error:** "Can't reach the server. Check your connection and try again."

---

## 9. Screens: admin area

Desktop-first (still usable on tablet). A top bar (brand · Admin, admin name, Member view, Log out) and a side nav with badges.

### 9.1 Dashboard `/admin` (screenshot 30)
- **Date range:** From/To, default the last 90 days.
- **Tiles:**
  - Active members (+ new in range);
  - **Invitation requests to review** (+ "2 waiting over 3 weeks", in red);
  - Open reports;
  - Follow-ups in the next 7 days;
  - **Active in the last 30 days**;
  - **Introductions in range** (asked · made · accepted);
  - **Team introductions** (made · accepted · waiting).
- **Cards:**
  - **wins in range:**
    - total, from introductions, from gatherings;
    - the private investment total;
    - counts by type and by month;
  - new members by month (bar chart, 12 months);
  - **upcoming gatherings** (seats confirmed / capacity, and how many to review);
  - **members by country** (top 10);
  - potential members by status;
  - outreach conversion table (non-linear; no funnel graphic);
  - upcoming follow-ups.

### 9.2 Invitation requests `/admin/requests` (screenshot 31)
"Every request gets an answer within 21 days. Oldest first."
- **Tabs:** Open / Invited / Declined / Spam / All.
- **Cards:**
  - name · role;
  - email · location · LinkedIn link;
  - a status badge: **"Waiting 3 days"** (yellow) or **"Overdue · 23 days"** (red);
  - "Asked 1 time before" if she requested before;
  - her statement (quote);
  - "Referred by …";
  - "Requested Sep 13 · Prospect record: Requested" (link);
  - prospect notes (collapsible).
- **Actions:**
  - **Send invitation** (confirm, optional internal note);
  - **Decline** ("We send a short, kind email… She can ask again after 90 days");
  - **Spam** (archives silently).
- **Decided cards:** "Invited by Grace on Oct 6: note".

**Review votes and member reviewers:**
- **Votes:** each card has a **Your vote** box (private note, **Approve** / **Decline**). The vote can be changed until the request is decided.
- **Tally:** a badge reads "1 approve · 1 decline · 2 needed".
- **Split votes:** a red **Needs decision** badge.
- **Automatic decisions:** when one side reaches the required number (Site settings, 1–3, default 2), the invitation or the decline email goes out automatically: "Enough approvals: the invitation was sent."
- **Who voted:** admins see each vote with name and note. **Member reviewers** see only the tally and their own vote.
- **The reviewer's view:** the same page in a cut-down admin shell. The header says "Women Builders · Reviewer" and the side nav has only Requests. There are no Invite / Decline / Spam buttons, and prospect records show as plain text. Members who are reviewers get a "Review requests" item in the member nav.
- **Waitlist tab:** requests sent while applications were closed. They have no clock and no voting until applications reopen.

### 9.3 Members `/admin/members` and account detail (screenshot 32)
- **List:** search, a status filter (All / Active / Deactivated / Deleted), and a table.
- **Detail:**
  - the **photo with "Remove photo"** (the member is emailed that it didn't meet the charter);
  - all fields, including hidden ones;
  - activity, reports, admin history;
  - Deactivate / Reactivate / Make admin / **Make member reviewer**;
  - a "Member reviewer" badge.

### 9.4 Potential members, prospect workspace, CSV import, follow-ups (screenshots 33–35)
Unchanged from the previous handoff, except:
- the status list now includes **Requested** (she asked for an invitation through the website);
- "Approved" is shown as **Joined**.

The statuses, in order:
- Identified
- Reviewed
- Contacted
- Follow-up needed
- Interested
- **Requested**
- Invited
- **Joined**
- Not interested
- Not a fit
- Do not contact (red)

Records that came from the website show the consent note under "Why we hold this record".

### 9.5 Gatherings `/admin/gatherings` (screenshots 36–38)
**List**
- **Tabs:** Upcoming / Past.
- **Table:** title (+ type, mode, Cancelled badges), when (local time), where, seats confirmed / capacity, and "4 to review" / "2 waitlisted".

**Create / Edit form**
- **Basics:**
  - title;
  - type (choosing a type sets the default seats);
  - topic and description (≤3,000);
  - start (local date-time), **time zone** (list), duration.
- **Where:**
  - online toggle;
  - city;
  - country;
  - venue address or online link ("Shown only to confirmed guests and hosts").
- **Seats:** the number of seats, seat mode (Curated / Open, with an explanation), requests close (local date-time).
- **Who it's for:**
  - All members;
  - Selected roles (checkboxes);
  - Invite-only (a member picker for the invitees).
- **Hosts:** "Hosted by the Women Builders team" toggle, plus a member picker (type a name, pick, remove chips).
- **"Show on the public website":** title, type, city and date only.
- **Saving:**
  - create: "Create and announce" (emails members in that country, or everyone eligible for online gatherings; or the invitees);
  - edit: "Save changes" ("If the time or place changed, confirmed guests were emailed").

**Detail: the request queue**
- **Summary line:** "6 / 12 confirmed" and the live **role mix**: "Founders 3 · Operators 1 · Investors 2 · Builders 0", to help balance the table.
- **Bulk actions:** select all waiting, then **Confirm selected (n)**.
- **Rows:**
  - photo, name, a status badge, primary role;
  - flags:
    - **"Blocked pair: Bea"** (red);
    - **"2 past no-shows"** (red);
    - "Late cancellation";
    - "Inactive";
  - headline · city, country;
  - her note in quotes.
- **Row actions:** **Confirm**, **Waitlist**, **Not this time**. Confirming beyond capacity shows "All 12 seats are taken."
- **After the start:** each confirmed row gets an **Attended / No-show** toggle.

**Also on the detail page**
- **Message confirmed guests:** subject + message, then "Sent to 6 confirmed guests".
- **Edit details:** a collapsible form.
- **Cancel this gathering** (danger, reason required, emailed to everyone with a request).

### 9.6 Invitations `/admin/invitations`
- **Intro:** "Joining is by invitation only. Links expire after 14 days… one reminder with a fresh link after 7 days."
- **Invite by email:** an input and a send button.
- **Table:** Email (+ prospect), Status (*pending / accepted / revoked / expired*), Sent, Expires, **Reminder** (date or —), By, Revoke.

### 9.7 Introduction requests `/admin/introductions` (screenshot 39)
"Members with no mutual connection can ask the team to introduce them (2 a month)…"
- **Tabs:** Waiting / Handled.
- **Cards:**
  - "Adaeze Nwosu would like to meet Divya Iyer" (both linked);
  - both headlines;
  - "Answer by…";
  - the note to the team;
  - the note for the person.
- **Actions:**
  - **Introduce**: a dialog with an optional note the member sees;
  - **Pass**: silent; after 14 days the member sees "No introduction was made".

### 9.8 Site settings `/admin/settings` (screenshot 40)
- **Applications:**
  - Open, or **Waitlist**;
  - a "Next review" line (≤80 characters, e.g. "Next review: March").
  - Reopening moves waitlisted requests into the queue and starts their 21-day clock ("Saved. 3 waitlisted requests moved to the queue…").
- **Review rules:** matching votes needed (1–3).
- **Public numbers:** a table with Number / Today / Show from (threshold) / Hide.
- **Homepage showcase:** a checklist of opted-in members (max 6, order = the order ticked, "#1"), with "no photo" hints, and **Save showcase**.
- **Quotes waiting for approval:** each with the quote, "Name, Role · from a win marked quotable", **Approve** / **Don't use**. Below, **On the website** lists approved quotes with Remove.
- Every change is audited.

### 9.9 Reports and audit log
- **Reports:** unchanged. The reasons now include **Inappropriate photo**.
- **Audit log new actions:**
  - `request.invite`, `request.decline`, `request.spam`;
  - `photo.remove`;
  - `gathering.create`, `gathering.update`, `gathering.cancel`, `gathering.seat_confirmed`, `gathering.attendance`, `gathering.message`;
  - `introduction.team_introduce`, `introduction.team_pass`;
  - `request.vote`;
  - `reviewer.grant`, `reviewer.revoke`;
  - `settings.update`;
  - `quote.approve`, `quote.reject`.

  Friendlier labels are welcome.

---

## 10. Emails

All emails share one layout:
- a wordmark;
- a heading;
- paragraphs;
- one CTA button;
- a footer with the app name, URL and, for notification emails, an **Unsubscribe from these emails** link.

Please design one responsive template that works in Gmail, Outlook and Apple Mail, in light and dark mode.

| Email | Trigger | Key content | CTA | Unsubscribe? |
|---|---|---|---|---|
| Request received | Invitation request sent | "Thank you, {first name}…" · hear back within three weeks | — | No |
| Already a member | Request from an existing member's email | "You already have an account" | Log in | No |
| Request declined | Admin declines | Kind, short; may ask again later | — | No |
| Invitation | Admin invites | "You're invited to Women Builders" · expires in 14 days | Accept invitation | No |
| Invitation reminder | 7 days unused | Fresh link, same expiry | Accept invitation | No |
| Overdue requests digest | Weekly, admins | "{n} requests have waited more than 3 weeks" | Open the Requests queue | No |
| Welcome | Joined | "Welcome to Women Builders, {name}!" | Complete your profile | No |
| Charter updated | Charter version changes | What changed, accept on next visit | Read the charter | No |
| Photo removed | Admin removes a photo | Didn't meet the charter; upload another | Edit your profile | No |
| Password reset / unusual sign-in / account deactivated | — | As before | — | No |
| Connection request / accepted / new message | — | As before | — | Yes |
| Introduction asked | A asks B | "Would you introduce {A} to {C}?" + A's note | Review the request | Yes |
| You've been introduced | B (or the team) introduces | "{B} would like to introduce you to {A}" | See the introduction | Yes |
| Introduction accepted | C accepts (to A and to B) | "You're now connected with {C}" / "Your introduction worked" | Send a message / Your introductions | Yes |
| Still investing? | Every 90 days, investors | "Are you still investing?" | Answer on your Home page | Yes |
| New gathering near you | Gathering created (same country or online) | Title, when, where | See the gathering | Yes |
| Gathering invitation | Invite-only gathering | "You're invited to {title}" | See the gathering | No |
| Seat confirmed / waitlisted / not this time | Seat decisions | Venue included when confirmed | Open the gathering | No |
| Gathering reminder | 2 days before; morning of | When, where, venue | Open the gathering | No |
| Gathering changed / cancelled | Admin edits time/place or cancels | New details / the reason | Open / see upcoming | No |
| Message from the team | Admin messages guests | Admin's subject and text | Open the gathering | No |
| Win confirmation | Named in a win | "{name} says: …" · confirm or decline | Confirm or decline | Yes |
| "Did anything come of it?" | 60 days after an introduction; 14 days after a gathering | Invitation to share a win | Share a win | Yes |
| Waitlist acknowledgement | Request while applications are closed | "You're on the waitlist" + next review | — | No |
| Seat freed (admins) | A confirmed guest deleted her account within 7 days | — | Open the request queue | No |

---

## 11. Components inventory

Please spec each component with its states: default, hover, focus, active, disabled, loading, error.

1. **Buttons:** primary, secondary, danger, ghost/link. Min height 44px. Loading label.
2. **Form fields:** text, email, password, number, **date-time**, textarea (with counter), select, checkbox, toggle, radio cards, **tag/chip input**, **photo uploader**, **member picker** (search + chips). Each has a label, required marker, hint, inline error and invalid border.
3. **Member card** (Discover, For you, Capital, Connections, Requests, Home):
   - photo, name (link), headline (2 lines max), company · location;
   - role badges, up to 6 expertise tags, status badge, **"Prefers introductions"** tag, **mutual connections**;
   - a body slot (reasons, investor or founder details, note, dates) and a footer action slot.
4. **Recommendation reason row:** icon + text per reason type (6.4).
5. **Avatar:** photo, or initials as the fallback, at 32 / 36 / 40 / 48 / 72 / 128px. Plus the **ghost** variant for deleted accounts.
6. **Badges:**
   - role (primary vs. secondary);
   - connection status;
   - **investing status**;
   - **funding status**;
   - **seat status**;
   - **gathering type**;
   - **introduction status**;
   - request status (waiting / overdue);
   - account status;
   - outreach status (11);
   - report status;
   - invitation status;
   - nav counts.
7. **Notices/alerts:** info, success, warning, error.
8. **Completeness meter.**
9. **Dialog/modal:** confirm, confirm with note, forms (connect, report, ask for introduction, introduce, request a seat, cancel seat).
10. **"More options" menu** (Report/Block).
11. **Empty state.**
12. **Pagination.**
13. **Navigation:** member top nav and the mobile pattern (11 destinations), admin side nav, badges.
14. **Message bubble** and **introduction note card**.
15. **Composer** and the read-only notice.
16. **Conversation row.**
17. **Stat tile.**
18. **Bar chart** with a text alternative.
19. **Data table.**
20. **Timeline** (prospect history).
21. **Filter panel** (Discover, Capital), **filter bar** (gatherings, admin).
22. **Stepper** (onboarding).
23. **Toast/flash.**
24. **Tabs** (Capital, Introductions, Gatherings, admin queues).
25. **Gathering card** and **gathering fact list** (when / where / seats / hosts).
26. **Attendee row**, with a host variant.
27. **Introduction card:** three variants for the three tabs.
28. **Seat queue row** (admin): checkbox, flags, actions, attendance toggle.
29. **Role mix bar** (admin): four counts, non-hierarchical.
30. **Public homepage blocks:** hero, role cards, benefit list, steps, number strip, gathering teaser card, footer.
31. **Charter text block.**
32. **Win card:** type, month, verified badge, people, story, optional action slot (confirm / delete).
33. **Vote box:** note + Approve / Decline, with the current vote highlighted; **tally badge**; **Needs decision** badge.
34. **Featured member tile** (public) and **quote block** (public).
35. **Settings table** (public numbers) and **ordered picker** (showcase).

---

## 12. Content, data and limits reference

### Profile fields
| Section | Field | Type | Limit / options | Hideable? |
|---|---|---|---|---|
| Basics | Full name | text | 2–100 | No |
| | **Photo** | image | JPEG/PNG/WebP ≤5 MB, cropped square by the server, stored at 512 and 128 px | No |
| | Headline | text | ≤120 | No |
| | Primary role / other roles | choice | Founder, Operator, Investor, Builder | No |
| | **City** | text | ≤100 | **Yes** (as Location) |
| | **Country** | list | all countries | **Yes** (as Location) |
| | LinkedIn, Website | URL | | **Yes** |
| About | Expertise | tags | ≤20 | No |
| | **Open to** | multi choice | Advising, Investing, Hiring, Being hired, Co-founding, Freelance or project work, Mentoring, Speaking | No |
| | Professional background | long text | ≤5,000 | **Yes** |
| | Current focus | long text | ≤1,000 | **Yes** |
| Needs & offers | What you need / What you can offer | long text | ≤2,000 each | **Yes** |
| Founder | Company name (req.) | text | ≤120 | **Yes** |
| | Company stage (req.) | choice | Idea, Pre-seed, Seed, Series A, Series B, Series C+, Bootstrapped, Public | No |
| | Industry | text | ≤80 | No |
| | Funding status | choice | Not raising, Raising now, Raising in 6 months, Recently closed a round | **Yes** |
| | **Raise amount** | number | USD thousands; only when raising | **Yes** |
| Operator | Function (req.), Seniority (req.), Focus areas | choice / tags | existing lists | No |
| Investor | **Firm or fund** | text | ≤120, optional | No |
| | **Investor type** | choice | Angel, VC fund, Family office, Corporate, Syndicate lead, Other | No |
| | Investment stages (req.) | multi | Pre-seed, Seed, Series A, Series B, Growth | No |
| | Check size min/max (req.) | numbers | USD thousands ("$25K–$100K", "$1.5M") | **Yes** |
| | Sectors | tags | ≤20 | No |
| | **Leads rounds** | choice | Leads, Follows, Both | No |
| | **Currently investing** | Yes / Paused | confirmed every 90 days | No |
| | **Last check written** | month + year | optional | No |
| Builder | Technical skills (req.), Project types, Collaboration interests | tags / text | | No |

### Other limits and timings
| Thing | Value |
|---|---|
| Invitation request statement | 20–1,000 characters |
| Answer to an invitation request | within 21 days (overdue after) |
| Re-request after a decline | 90 days |
| Invitation link | 14 days, single use; reminder with a fresh link after 7 days |
| Connection request note | 0–500 |
| Connection request expiry | 30 days |
| Message | 1–5,000 |
| Introduction notes | to the introducer ≤1,000; to the person ≤500; introducer's note ≤500 |
| Introduction response windows | 14 days for the introducer, then 14 days for the person |
| Seat request note | ≤300 |
| Late cancellation | within 24 hours of the start |
| Gathering reminders | 2 days before; on the morning of (from 7:00 local time) |
| "People you met" window | 30 days after the gathering |
| No-show flag in seat queues | 2 or more past no-shows |
| "Still investing?" | asked every 90 days; "not confirmed" after 120 |
| "Not now" on a recommendation | hidden 30 days |
| Report details | ≤2,000 |
| Password reset link | 1 hour |
| Session length | 30 days |
| Message delivery while open | ≤ ~3 seconds |
| Badge refresh | 30 seconds |
| Directory page size | 20 |
| Recommendations shown | up to 20 |
| Public number thresholds | members 50, countries 5, introductions 25, gatherings 3 |

---

## 13. Accessibility, responsive and technical constraints

- **WCAG 2.1 AA:**
  - contrast ≥4.5:1 for text, ≥3:1 for large text and UI;
  - visible focus;
  - never color alone ("Overdue" is a word, not just red).
- **Touch targets** of at least 44×44px.
- **Keyboard:** everything reachable, with a skip link. Modals trap focus and restore it on close.
- **Screen readers:** labels on icon buttons, live regions for save status and new messages, text alternatives for charts and the role mix.
- **Breakpoints:** mobile 320–639, tablet 640–1023, desktop 1024+.
- **No hover-only features.**
- **Fonts:** a strict Content Security Policy means fonts must be **self-hosted** (no Google Fonts CDN, no third-party scripts). Please pick fonts with a self-hostable web license.
- **Images:**
  - **profile photos are square crops** served at 128 and 512 px, so design circular or rounded-square masks that work with any square image;
  - illustrations are welcome as SVG files;
  - homepage photography must be licensed. **Don't use pictures of real members** unless they opted in (a later release).
- **Times:** gathering times are shown in the gathering's own time zone, with the zone abbreviation, so leave room for "GMT+1".
- **Tech:** React / Next.js + Tailwind CSS. Avoid designs that need heavy JS animation libraries.

---

## 14. Voice and copy

- **Warm, direct, respectful.** Short sentences. Address the member as "you". Use first names for other members.
- **Never shame or alarm.** Limits and errors explain what happened and what to do next.
- **Every "no" is kind and silent** — no copy ever reveals who declined.
- **Microcopy already in the product** (keep or improve, but keep the meaning):
  - "One reply from a human, either way."
  - "Our team reads every request."
  - "Be specific: 'intros to seed fintech investors' beats 'help'."
  - "🔒 Mei shares some details only with connections."
  - "Nobody is ever told who said no."
  - "We couldn't fit you at this one. We'd love to see you at the next."
  - "What's shared at a gathering stays there, as our charter says."
  - "Founders in the Capital view see investors who confirmed recently first."

---

## 15. Open design questions

These are ours to decide together; your recommendation is welcome.

1. **Brand:** name treatment, logo, palette (the purple is a placeholder), photography/illustration style for the homepage.
2. **Dark mode:** worth doing in v1?
3. **Mobile navigation:** with 11 member destinations, which 4–5 are tabs?
4. **Role colors:** if the 4 roles get colors, keep them accessible and strictly non-hierarchical.
5. **Capital cards vs. Discover cards:** one component with slots, or distinct?
6. **Gathering imagery:** should gatherings have a cover image or illustration per type?
7. **Message report affordance on mobile:** long-press, kebab or swipe?
8. **Admin density:** a compact table mode?
9. **Public numbers:** how to make 1–4 numbers look intentional rather than sparse.

---

## 16. Glossary

| Term | Meaning |
|---|---|
| Member | An active account with a profile |
| Invitation request | A visitor's request to join, answered by the team within 21 days |
| Invitation | A single-use 14-day link that lets a person join |
| Charter | The community rules every member accepts |
| Potential member / prospect | A person the team tracks (admin-only CRM record; not an account) |
| Connection | Two members who accepted each other; can message |
| Warm introduction | A asks B, a mutual connection, to introduce her to C |
| Ask the team | An introduction made by the Women Builders team when no one in her network can |
| Prefer introductions | A setting: no direct requests; people reach her through introductions |
| Capital view | The investors / founders-raising lens on the directory |
| Currently investing | An investor's yes/paused answer, confirmed every 90 days |
| Gathering | A dinner ("table") or working session ("room"), in person or online |
| Curated / Open seats | The team picks guests / first come, first served with a waitlist |
| People you met | Attendees of the same gathering, connectable directly for 30 days |
| Open to | What a member is available for (advising, hiring…) |
| Completeness | Profile score 0–100%; 60% + required fields unlock requests and introductions |
| Hidden field | A profile detail visible only to connections |
| Deleted account | An erased account; their conversations stay for the other person, read-only |
| Block | Mutual invisibility + no contact; silent |
| Report | A confidential safety report reviewed by admins |
| Do not contact (DNC) | A prospect who asked never to be contacted; kept as suppression |
| Member reviewer | A member who can read and vote on invitation requests, and nothing else in admin |
| Waitlist | Applications closed: requests are collected and answered after the next review |
| Win | Something that came of the network; anonymous by default; confirmed by the people named |
| Showcase | Up to 6 opted-in members featured on the public homepage |

---

### Screenshot index (`docs/handoff-screens/`): current placeholder UI, for structure only
| File | Screen |
|---|---|
| 01-homepage | Public homepage |
| 02-request-invite | Request an invitation |
| 03-join | Join with an invitation |
| 04-login | Log in |
| 05-charter-accept | Charter interstitial |
| 06-home | Member Home |
| 07-discover | Discover |
| 08-capital-investors | Capital: investors |
| 09-capital-founders | Capital: founders raising |
| 10-gatherings | Gatherings list |
| 11-gathering-detail | Gathering detail (confirmed guest) |
| 12-for-you | Recommendations |
| 13-member-profile-introduction | Profile of someone who prefers introductions |
| 14-ask-introduction-dialog | Ask for an introduction dialog |
| 15-edit-profile | Edit profile (photo, location, investor fields) |
| 16-connections | Connections |
| 17-requests | Connection requests |
| 18-introductions | Introductions (For me) |
| 19-inbox | Inbox |
| 20-conversation-introduced | Conversation opening with an introduction note |
| 21-settings | Settings |
| 22-mobile-home | Mobile Home (shows the wrapping nav) |
| 30-admin-dashboard | Admin dashboard |
| 31-admin-requests | Invitation requests queue |
| 32-admin-member | Member detail |
| 33-admin-prospects | Potential members |
| 34-admin-prospect | Prospect workspace |
| 35-admin-import | CSV import |
| 36-admin-gatherings | Gatherings list |
| 37-admin-gathering-new | Create gathering |
| 38-admin-gathering-queue | Seat queue |
| 39-admin-introductions | "Ask the team" queue |
| 23-wins | Wins page (shared wins) |
| 24-share-win | Share a win form |
| 25-settings-public-website | Settings: public website (showcase opt-in, quote) |
| 26-homepage-showcase | Homepage "Some of the members" section |
| 40-admin-settings | Site settings (applications, votes, public numbers, showcase, quotes) |
| 41-reviewer-requests | The requests queue as a member reviewer sees it |
