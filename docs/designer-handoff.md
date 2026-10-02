# Women Builders: Designer Handoff

**This document is the complete brief for designing the Women Builders web platform.** It covers what the product is, who it serves, every screen and state, and every rule the UI must respect. You shouldn't need anything else, but questions are welcome (section 15).

The platform is **fully built and working**, with placeholder styling. Your job is the visual and interaction design. You don't need to invent features: everything listed here already exists and behaves as described. Screenshots of the current placeholder UI are in `docs/handoff-screens/`. **Treat them as wireframes showing content and structure, not as a style to follow.**

---

## Contents
1. [The product in one page](#1-the-product-in-one-page)
2. [Who uses it](#2-who-uses-it)
3. [Design principles](#3-design-principles)
4. [What we need from you](#4-what-we-need-from-you-deliverables)
5. [Site map and navigation](#5-site-map-and-navigation)
6. [Core concepts the UI must express](#6-core-concepts-the-ui-must-express)
7. [Screen-by-screen: public and account screens](#7-screens-public-and-account)
8. [Screen-by-screen: member area](#8-screens-member-area)
9. [Screen-by-screen: admin area](#9-screens-admin-area)
10. [Emails](#10-emails)
11. [Components inventory](#11-components-inventory)
12. [Content, data and limits reference](#12-content-data-and-limits-reference)
13. [Accessibility, responsive and technical constraints](#13-accessibility-responsive-and-technical-constraints)
14. [Voice and copy](#14-voice-and-copy)
15. [Open design questions](#15-open-design-questions)
16. [Glossary](#16-glossary)

---

## 1. The product in one page

**Women Builders is a curated, application-only professional community** for women who are **founders, operators, investors and builders**. It solves one problem: *finding the right people*. That means the investor who backs your stage, the operator who has scaled what you're scaling, or the engineer who wants to advise.

The core loop:

1. **Apply.** A person applies. The team reviews every application by hand, or invites people directly.
2. **Build a profile.** An approved member builds a profile that says what she does, what she's working on, **what she needs**, and **what she can offer**.
3. **Discover.** The platform recommends relevant members, with a plain-language reason for each ("Can help with what you need: fundraising, investor intros"). Members can also search and filter the directory.
4. **Connect.** Members send connection requests with an optional note. The recipient accepts or declines, and a decline is never shown to the sender.
5. **Talk.** Connected members message each other directly.

A separate **admin area** lets the team:
- review applications;
- manage members;
- run outreach to prospective members (a lightweight CRM with follow-up reminders and CSV import);
- send invitations;
- handle safety reports;
- watch community growth.

**What makes it different from LinkedIn:** it's small and curated, it matches on *needs and offers* rather than job titles, it's private by default, and it has strong safety controls (block, report, silent declines). The tone should feel **warm, trustworthy, ambitious and calm**, never like a noisy social feed.

**Platform:** a responsive web app. There are no native apps, but it must work beautifully on phones (members check messages and requests on the go).

---

## 2. Who uses it

### Member roles
Every member has exactly **one primary role** and **zero to three secondary roles**. A founder who also angel-invests is Founder (primary) plus Investor (secondary). All four roles are equally important, so don't design a hierarchy between them.

| Role | Who | Typically needs | Typically offers |
|---|---|---|---|
| **Founder** | Started or starting a company | Investors, early hires, operators' advice, co-founders | Domain expertise, market access, peer support |
| **Operator** | Runs a function inside a company (VP Growth, Head of People…) | Peers, career moves, mentorship | Functional expertise (hiring, GTM, finance…) |
| **Investor** | Angel, VC, fund | Deal flow | Capital, fundraising advice, intros |
| **Builder** | Engineer, designer, maker | Projects, collaborators, advisory roles | Technical and product skills |

### Personas to design for
- **Amara, founder (pre-seed, Lagos).** Raising her first round. Checks the app on her phone between meetings. Wants investor intros *now* and needs to know who is worth her time.
- **Priya, VC partner (San Francisco).** Busy. Gets many requests and needs to scan them quickly, accept a few, and politely ignore the rest without awkwardness.
- **Mei, staff ML engineer (Toronto).** Private person. Hides her location and some details from strangers. Open to advising AI startups.
- **Grace, community admin.** Runs outreach and reviews applications on a laptop. Needs dense, efficient screens, and wants to know at a glance who needs a follow-up today.

### Account states (the UI differs for each)
| State | What the person sees |
|---|---|
| **Visitor** (logged out) | Landing, Apply, Log in, password reset |
| **Pending applicant** | Only the "application under review" page (plus "confirm your email" prompts) |
| **Active member** | The member area |
| **Active member with an incomplete profile** | Everything, but *connection requests are locked* until the profile is complete enough (see 6.3) |
| **Rejected applicant** | A message after logging in: can re-apply after 90 days |
| **Deactivated (self)** | Login offers "Reactivate my account" |
| **Deactivated (by admin)** | Login shows "deactivated by the team, contact us" |
| **Deleted account** | The person is gone (cannot log in). Other members only ever see them as **"Deleted account"** in old conversations (see 6.6) |
| **Admin** | The admin area. An admin may *also* be a member with a profile, and then gets a "Member view" / "Admin" switch |

---

## 3. Design principles

1. **People first, not feeds.** There's no timeline, no likes, no follower counts. Every screen is about *specific people and why they matter to you*.
2. **Explain every match.** Recommendations always show *why* ("Shared expertise: fintech", "Looking for what you offer: design partner"). Make these reasons prominent and scannable.
3. **Safety is visible but calm.** Block and Report are always reachable, but tucked into a "More" menu, not shouted. Declines are silent. Hidden details show a gentle lock notice.
4. **Needs and offers are the heart of the profile.** Give them visual weight. They drive matching.
5. **Curated means considered.** Generous whitespace, fewer and higher-quality elements, and confident typography. It should feel like a private club, not a job board.
6. **Admin screens are tools.** Dense, fast, keyboard-friendly, and table-heavy is fine. Members never see them.
7. **Inclusive by default.** WCAG 2.1 AA, 44×44px touch targets, no information by color alone, and a dark mode is welcome (optional, see section 15).

---

## 4. What we need from you (deliverables)

1. **A visual design system:**
   - color tokens (light, and optionally dark), type scale, spacing, radii, elevation;
   - iconography style;
   - avatar treatment (we use **initials avatars** for now, since photo upload is not in this release, but leave room for photos later);
   - component specs for everything in section 11.
2. **High-fidelity designs** for every screen in sections 7–9, at **mobile (390px)** and **desktop (1280px)**. Tablet can be inferred.
3. **All states** listed per screen: empty, loading, error, disabled, and the permission variants.
4. **Mobile navigation pattern.** The current placeholder nav wraps badly on phones (see screenshot `17-mobile-for-you.png`). We suggest a bottom tab bar (Home, Discover, Messages, Profile) plus a menu for the rest, but it's your call.
5. **Email template** (one layout that fits all emails in section 10).
6. **Brand touches:** logo/wordmark (currently plain text "Women Builders"), favicon, and a simple landing page.
7. Prototype links or annotations for key interactions: send request, accept/decline, messaging, the onboarding wizard, and the admin outreach log.

Our frontend uses **Tailwind CSS**, so tokens expressed as a Tailwind theme (colors, font sizes, spacing) are easiest for us to implement, but any clear format works.

---

## 5. Site map and navigation

```
PUBLIC
  /                         Landing
  /register                 Apply to join (also: accept invitation, /register?invite=…)
  /login                    Log in
  /forgot-password          Request reset link
  /reset-password?token=    Choose new password
  /verify-email?token=      Email confirmation result
  /pending                  Application under review (pending applicants only)
  /unsubscribed             One-click email unsubscribe confirmation
  /onboarding               4-step profile wizard (first login after approval)

MEMBER AREA (main nav)
  /dashboard                Home
  /search                   Discover (directory search + filters)
  /recommendations          For you
  /connections              Connections
    /connections/requests   Requests (received and sent)
  /messages                 Inbox
    /messages/[memberId]    Conversation
  /profile                  My profile (as others see it)
    /profile/edit           Edit profile
  /settings                 Settings
  /members/[id]             Another member's profile

ADMIN AREA (side nav)
  /admin                    Dashboard
  /admin/applications       Applications to review
  /admin/members            All accounts
    /admin/members/[id]     Account detail + actions
  /admin/prospects          Potential members (outreach CRM)
    /admin/prospects/[id]   Prospect workspace
    /admin/prospects/import CSV import
  /admin/follow-ups         Follow-up queue
  /admin/invitations        Invitations
  /admin/reports            Safety reports
  /admin/audit              Audit log
```

**Member nav badges:**
- **Messages:** unread count. It refreshes every 30 seconds.
- **Pending incoming requests:** today the count appears on the Home tile and on the Connections page's "Requests" button. A nav badge for it would be welcome.

**Admin nav badges:**
- **Applications:** verified applications waiting for review.
- **Follow-ups:** due today or overdue.
- **Reports:** open reports.

---

## 6. Core concepts the UI must express

### 6.1 Connection status (between the viewer and another member)
Every member card and profile shows one of four states, each with its own actions:

| Status | Shown as | Primary action | Secondary |
|---|---|---|---|
| `none` | Nothing, or "Connect" | **Connect** (opens a note dialog) | — |
| `pending_sent` | "Request pending" | Withdraw request | — |
| `pending_received` | "Wants to connect" + their note | **Accept** | Decline (with reassurance: "they won't be notified") |
| `connected` | "Connected" | **Message** | Remove connection |

Always available (in a "More" menu): **Report** and **Block**.

> **Silent decline.** When someone declines, the sender keeps seeing "Request pending" until the request expires (30 days). Never design any UI that hints at a decline.

### 6.2 Privacy: hidden fields
Members can mark these fields **"only connections see"**:
- location
- professional background
- current focus
- what I need
- what I can offer
- company name
- funding status
- check size
- LinkedIn
- website

These are **always visible to everyone**: name, headline, roles and expertise tags. **Email is never shown** to other members.

When a stranger views a profile with hidden fields, those sections simply don't appear, and a single calm notice appears: *"🔒 Mei shares some details only with connections."* In the editor, each hideable field needs a clear "Only connections" toggle. Consider a small lock icon next to fields that are currently hidden.

### 6.3 Profile completeness gate
- **Score:** a 0–100% score. There are 7 core fields (headline, background, expertise, current focus, needs, offerings, location) plus 3–4 role-specific fields **for every role the member holds**.
- **Unlocking requests:** a member can **send connection requests only at ≥60% and** with her primary role's required fields filled:
  - Founder: company name and stage.
  - Operator: function and seniority.
  - Investor: investment stages and check-size range.
  - Builder: technical skills.
- **Everything else stays open.** Incomplete members can still browse, search, accept requests and message connections.
- **Where the score shows:** as a meter with a list of what's missing, on Home, My profile, the editor (sticky) and the onboarding wizard.
- **Where the gate shows:** wherever "Connect" appears. The button is disabled with an explanation and a link: "Complete your profile to send connection requests."

### 6.4 Recommendations and reasons
Each recommendation includes up to three **reasons**. Design a visual treatment (icon + text) for each reason type:

| Type | Example copy |
|---|---|
| Needs → offers | "Can help with what you need: fintech, investor, intros" |
| Offers → needs | "Looking for what you offer: design, partner" |
| Role fit | "Investor: a natural fit for your work as a founder" / "Fellow founder" |
| Shared expertise | "Shared expertise: payments, fintech" |
| Mutual connections | "2 mutual connections" |

"Not now" hides a recommendation for 30 days. Up to 20 are shown. If there are fewer than 5, show a gentle nudge to improve the profile.

### 6.5 Limits (design the "hit the limit" states)
| Limit | Value | Message tone |
|---|---|---|
| Connection requests | 20 per rolling 24h | "You've sent 20 connection requests in the last 24 hours. Please try again later." |
| Unanswered messages in one conversation | 20 in a row | "You've sent 20 messages without a reply. Wait for Priya to respond." |
| Withdrawn request cooldown | until the original expiry date | "You withdrew a request to this member recently. You can send a new one after October 28." |

### 6.6 Read-only conversations
A conversation becomes read-only (history visible, composer replaced by a notice) when:
- the connection was removed: *"This connection was removed. The conversation is read-only."*
- the other member is no longer active: *"This member is no longer active. The conversation is read-only."*

- the other person **deleted their account**: *"This account was deleted. You can still read your conversation, but it is read-only."* The name shows as **"Deleted account"** with a neutral placeholder avatar (no initials, no profile link, no headline). Their messages stay exactly as they were. Design this as a distinct, calm "ghost" treatment that is clearly different from a normal member and from a blocked one.

A **blocked** member's conversation disappears entirely for both people.

---

## 7. Screens: public and account

### 7.1 Landing `/` (screenshot 01)
- **Content:** name/logo, one-line value proposition, the eligibility statement (*"Women Builders is a community for women founders, operators, investors and builders."*), **Apply to join** (primary) and **Log in**.
- **Flash messages** after account actions: "Your account has been deleted." / "Your account is deactivated. Log in any time to reactivate it."
- This is currently minimal. You're welcome to design a proper marketing landing page: how it works in 3 steps, the four roles, trust/curation messaging.

### 7.2 Apply `/register` (screenshot 02)
- **Fields:**
  - Full name
  - Email
  - Password, with the rule hint: *8+ characters, an uppercase letter, a lowercase letter and a number*
  - Primary role: a 4-option choice, each with a one-line hint. Consider cards instead of a dropdown.
  - Headline (≤120 characters, e.g. "Founder of Loop · B2B payments")
  - "What are you building, and why do you want to join?" (20–2,000 characters, *"Our team reads every application."*)
- **Invitation variant** (`?invite=…&email=…`):
  - Title: "Accept your invitation".
  - Email is prefilled.
  - Info notice: "You were invited, so your account will be active right away."
  - Button: "Create account".
- **Errors:** inline per field. The form never loses what was typed. "An account with this email is already registered." "This invitation link is invalid or has expired." "Please register with the email address the invitation was sent to."
- **After submit:** normal applications go to `/pending`, invited people go to `/onboarding`.

### 7.3 Log in `/login` (screenshot 03)
- **Content:** email, password, "Forgot password?", "Apply to join".
- **Errors** (all generic, by design):
  - "Email or password is incorrect." (the same message for an unknown email, a wrong password, or a locked account)
  - "Too many attempts. Try again in 15 minutes, or reset your password."
  - "Your application wasn't approved. You can apply again 90 days after the decision."
  - "This account has been deactivated by the Women Builders team. Contact us if you think this is a mistake."
- **Self-deactivated state:** after a correct password, swap the form for a notice ("You deactivated your account…") with **Reactivate my account** and **Cancel**.
- **After a password reset:** a success banner, "Your password was changed. Log in with your new password."

### 7.4 Forgot / reset password
- **Forgot:** email field. After submit, always: *"If an account exists for x@y.com, we've sent a link to reset your password. It expires in 1 hour."*
- **Reset:** new password with the rule hint, then back to login with the success banner. Invalid or expired link: "This link is invalid or has expired."

### 7.5 Confirm email `/verify-email`
- **States:** "Confirming your email…", then either success ("Your email is confirmed. Our team will review your application.") or an error with a link back to request a new one.

### 7.6 Application under review `/pending` (screenshot 04)
- **Content:** "Your application is under review", personal thank-you, and the email we'll write to.
- **Email not confirmed:** warning "Please confirm your email address. We can only review your application once it's confirmed." + **Resend confirmation email** (limited to 3 per hour; show the error if hit).
- **Email confirmed:** success "Email confirmed. Your application is in the review queue."
- **Always:** Log out.

### 7.7 Onboarding wizard `/onboarding`
This is the first screen after approval, and it can't be skipped into the app until finished. It has 4 steps with a progress indicator and a live completeness meter (6.3). Each "Save and continue" saves.

1. **The basics:** name, headline, primary role, other roles (multi-select), location, LinkedIn URL, website.
2. **Your roles:** a section per role held. Details in section 12. Required fields are marked for the *primary* role only.
3. **Expertise and focus:** expertise tags (up to 20), professional background, current focus.
4. **Needs and offerings + privacy:** "What you need", "What you can offer" (with the tip *"Be specific: 'intros to seed fintech investors' beats 'help'"*), then the privacy toggles. Buttons: **Finish** and **Skip for now**.

Back is available on steps 2–4. Validation errors appear inline.

---

## 8. Screens: member area

### 8.1 Home `/dashboard` (screenshot 06)
- **Completeness warning** (only if the gate isn't met): "Your profile is 45% complete (still needed: Company stage). Reach 60% to start sending connection requests. [Finish your profile]"
- **3 summary tiles:** Connection requests (count), Unread conversations (count), Profile completeness (%). Each links onward.
- **New messages:** up to 3 unread conversations (avatar, name, last message preview).
- **Recommended for you:** top 3 recommendation cards + "See all".
- **Empty states:** no recommendations ("Tell us what you need and offer to get matched").

### 8.2 Discover `/search` (screenshot 07)
- **Filters** (a side panel on desktop; suggest a drawer or sheet on mobile):
  - keyword search (name, company, keyword)
  - primary role (multi)
  - "also holds role" (multi)
  - expertise tags
  - location (free text)
  - **Search** and **Clear**
- **Results:** a count ("24 results") and a grid of **member cards** (11.2), each showing its top match reason. Pagination: 20 per page, Previous/Next with "Page 2 of 5".
- **Ranking:** when searching by name, exact and prefix name matches come first.
- **Empty states:** "No members match your search. Try fewer filters or a different keyword." / "No members yet."

### 8.3 For you `/recommendations` (screenshot 08)
- **Content:** a heading and subtitle ("Members matched to your roles, needs, offerings and expertise."), then up to 20 recommendation cards. Each card shows up to 3 reasons (6.4), with **View profile** and **Not now** (hides for 30 days).
- **Few results (fewer than 5):** info notice, "We only found a few strong matches. A more detailed profile helps us find more."
- **None:** empty state with links to edit the profile or search.

### 8.4 Member profile `/members/[id]` (screenshots 09, 10)
- **Header:**
  - initials avatar, name, headline, role badges (primary emphasized)
  - location · "Member since September 2026"
  - LinkedIn / Website links (open in a new tab)
- **Actions column:** the connection-status actions from 6.1, plus "More options" → Report, Block.
- **Main column:** Current focus, **Looking for** (needs), **Can help with** (offerings), Background.
- **Side column:** Expertise tags, then a card per role held:
  - **Founder:** company, stage, industry, funding
  - **Operator:** function, seniority, focus areas
  - **Investor:** stages, check size (e.g. "$250K–$1.5M"), sectors
  - **Builder:** skills, project types, collaboration interests
- **Hidden-fields notice** for non-connections (6.2).
- **Profiles of blocked, pending, deactivated or unknown members** show the 404 page ("We couldn't find that page").
- **Dialogs** (all native modals with focus trapping):
  - **Connect:** optional note (≤500 characters, with a live "123/500" counter), Cancel / **Send request**. On success, flash "Connection request sent." If her request crossed with one from the other person, they're connected immediately: "You're now connected with Priya."
  - **Remove connection:** "You won't be able to message each other. Your conversation history stays visible to both of you. Priya won't be notified." → Remove.
  - **Block:** three bullet consequences, "You can unblock people in Settings." → Block (danger). Afterwards she's sent to Home.
  - **Report:** reason (Harassment or unwanted contact / Spam or unsolicited selling / Fake or impersonating profile / Inappropriate content / Something else), optional details (≤2,000). Success: "Thank you. Our team will review your report. Priya won't be told who reported them." + suggest blocking.

### 8.5 My profile `/profile`
This is the same layout as 8.4, seen as yourself: all fields visible and no hidden notice. The action is **Edit profile**, with a completeness warning if under 60%.

### 8.6 Edit profile `/profile/edit` (screenshot 15)
- **Layout:** one long form with a **sticky completeness meter**. Sections: Basics, About your roles, Expertise and focus, Needs and offerings, Privacy (fields in section 12).
- **Save:** Save profile, with "Saving…" then "Saved", and inline errors.
- **Role sections** appear and disappear as roles are toggled.
- **Tag inputs:** chips with a remove "×". Enter or comma adds a tag, and Backspace removes the last one. Tags are normalized to lowercase-hyphenated ("Machine Learning" → `machine-learning`), so show normalized chips after save.

### 8.7 Connections `/connections` (screenshot 11)
- **Header:** "Connections, 12 total", plus a **Requests** button with an incoming-count badge.
- **Search:** by name or keyword.
- **Grid:** member cards with "Connected Sep 28, 2026", **Message** and **Profile**.
- **Empty states:** "No connections yet" (link to recommendations or Discover), and "No connections match".

### 8.8 Requests `/connections/requests` (screenshot 12)
- **Received (n):** cards with their note (quote style), "Received Sep 28 · expires Oct 28", **Accept** / **Decline**.
- **Sent (n):** cards with "Sent … · expires …" and **Withdraw**. Silently declined requests appear here as normal pending requests.
- **Empty states:** "No new requests" / "No pending sent requests".

### 8.9 Inbox `/messages` (screenshot 13)
- **List:** conversations sorted by latest activity. Each row: avatar, name (bold if unread), "(read-only)" tag if applicable, time (today → "3:42 PM", else "Sep 28"), last message preview prefixed "You:" if hers, and an unread count badge.
- **New connections** with no messages yet show "Say hello 👋".
- **Deleted accounts:** the row stays, named "Deleted account" with the ghost avatar and the "(read-only)" tag.
- **Empty:** "No conversations yet. You can message anyone you're connected with. See your connections."

### 8.10 Conversation `/messages/[memberId]` (screenshot 14)
- **Header:** back (mobile), avatar, name (links to profile if active), headline.
- **Messages:** chronological bubbles, sender right and recipient left, with a timestamp and "Read" on your latest read messages. Report is available on messages from the other person (currently on hover or focus; please design a mobile-friendly equivalent, e.g. long-press or a per-message menu).
- **Optimistic sending:** "Sending…" then sent. On failure: "Failed. Retry".
- **New incoming messages** appear within ~3 seconds (the app polls). Consider a subtle arrival animation and "new messages" jump affordance when scrolled up.
- **Composer:** multi-line, Enter sends and Shift+Enter adds a new line, max 5,000 characters, Send disabled when empty. Errors (limits) appear above the composer.
- **Read-only state:** a notice replaces the composer (6.6). This includes conversations with a **deleted account**: the header shows "Deleted account" (not a link), and every message stays readable. Reporting a message from a deleted account is still possible.
- **Empty conversation:** "This is the start of your conversation with Priya."

### 8.11 Settings `/settings` (screenshot 16)
1. **Email notifications:** three toggles, saved instantly with "Saved":
   - connection requests
   - accepted requests
   - new messages ("At most one email per conversation every 30 minutes")

   Note: "Emails go to x@y.com. Account and security emails are always sent."
2. **Password:** current + new password, with the success message "Password changed. You've been logged out of your other devices."
3. **Blocked members:** a list with name, "Blocked Sep 28", and Unblock. Empty: "You haven't blocked anyone."
4. **Your account and data:**
   - **Download your data** (a JSON file).
   - **Deactivate account:** dialog with the password, "Log in again any time to reactivate".
   - **Delete account** (danger): dialog with the consequences, a password field, and "type DELETE to confirm". Button: *Delete forever*. Be very clear about what happens: her name, email, profile, connections and requests are **permanently erased**, but **her conversations are kept**: the people she talked to can still read them, as from "Deleted account", and can't reply. Messages she already sent can't be taken back. (Same model as Telegram.)

### 8.12 Unsubscribed `/unsubscribed`
The result of one-click unsubscribe from an email: "You're unsubscribed. You won't get emails about new messages anymore." + "Manage email settings". Invalid link variant: "This link didn't work."

### 8.13 Global states
- **404:** "We couldn't find that page". Used for missing pages *and* unavailable profiles.
- **Error:** "Something went wrong. Please try again. If it keeps happening, contact us and mention reference 1a2b3c4d." + Try again.
- **Network error** (any action): "Can't reach the server. Check your connection and try again."

---

## 9. Screens: admin area

Admin screens are desktop-first (still usable on tablet). Layout: a top bar (brand + "Admin", admin name, "Member view" if she also has a profile, Log out) and a side nav with badges (section 5).

### 9.1 Dashboard `/admin` (screenshot 20)
- **Date range picker:** From/To, default the last 90 days, Apply.
- **4 stat tiles** (clickable):
  - Active members (+ "6 new in range")
  - Applications to review (+ "2 awaiting email confirmation")
  - Open reports
  - Follow-ups in next 7 days
- **New members by month:** a bar chart of the last 12 months (by approval date).
- **Potential members by status:** 11 status badges with counts, each linking to the filtered list.
- **Outreach conversion table:** for each status, *Entered* (in range), *Became members*, *Conversion %* ("—" when zero entered). The funnel is **non-linear**: people can skip or revisit statuses. Please don't design a classic funnel graphic that implies a fixed order.
- **Upcoming follow-ups:** up to 10 names with a due date. "Overdue" is shown in red, "Today" emphasized.

### 9.2 Applications `/admin/applications` (screenshot 21)
- **Cards** in review order (confirmed emails first), each with:
  - name (links to the account), email, "applied Sep 28"
  - headline
  - badges: role, "Email confirmed" or "Email not confirmed", and "Prospect: Contacted" if they were in the outreach CRM
  - the application statement (quote block)
  - "Referred by X" if known
- **Actions:**
  - **Approve**: confirm dialog + optional internal note. "Their account becomes active and they get a welcome email." Only possible once the email is confirmed; otherwise show "Can be approved once they confirm their email."
  - **Reject** (danger): confirm dialog + optional internal note. "They receive a neutral email and may apply again after 90 days."
- **Empty:** "No applications waiting".

### 9.3 Members `/admin/members` (screenshot 22) and account detail
- **List:**
  - Search (name, email, company) + status filter (All / Active / Pending / Deactivated / Rejected / Deleted).
  - Table columns: Name (+ Admin badge, email beneath), Role, Status badge, Joined, Last active, Reports (red "2 open").
  - 25 per page.
- **Detail** `/admin/members/[id]`:
  - **Header:** name, email, status badge ("deactivated by admin" / "by self"), Admin badge, "Email not confirmed".
  - **Actions** (none on your own account):
    - Approve (if pending)
    - **Deactivate** (danger, with a reason): "They are signed out everywhere immediately, hidden from members, and emailed…"
    - Reactivate
    - **Make admin / Remove admin access**: confirm dialogs. The last admin can't be removed.
  - **Profile card:** all fields *including hidden ones*, labeled "(admins see all fields, including hidden ones)", plus the application statement and review note.
  - **Side cards:**
    - Activity: applied, approved, last active, connections, messages sent, requests sent, link to the prospect record
    - Reports about this member
    - Admin history (audit entries)

### 9.4 Potential members `/admin/prospects` (screenshot 23)
This is the outreach CRM for people the team wants to recruit.
- **Toolbar:** "Import CSV", **Add potential member**.
- **Filter bar:**
  - search (name, email, company, role, LinkedIn)
  - status
  - follow-up date from/to
  - owner (Anyone / Assigned to me / Unassigned / each admin)
  - archived (Hide / Include / Only)
  - Apply / Reset
- **Table:** Name (+ Archived badge, email or LinkedIn beneath), Company, Role, Status badge, Next follow-up, Owner. Sorted by next follow-up.
- **Add dialog:**
  - name (required)
  - **email and/or LinkedIn URL** (at least one: "We use them to prevent duplicate outreach")
  - company, role, discovery source, next follow-up, referred by, referrer email, owner
  - "Why are we storing this person's details?"
- **Live duplicate warning** while typing: "Already tracked: Rachel Kim (contacted)" / "Already has an account: …". Hard errors:
  - "X asked not to be contacted. This record can't be added again."
  - "X is already tracked as a potential member."
  - "X already has a Women Builders account."

### 9.5 Prospect workspace `/admin/prospects/[id]` (screenshot 24)
- **Header:** name, "Role at Company", status badge, Archived badge, "Member account: active" link if they joined. **Send invitation** (if they have an email, aren't a member and aren't do-not-contact). Or "Invitation sent Sep 28, expires Oct 12".
- **Do-not-contact banner** (red): "This person asked not to be contacted. The record is kept permanently so they are never contacted again." Outreach logging and invitations are hidden in this state.
- **Log outreach form:** date (defaults to today), method (Email / LinkedIn / Phone / Event / Intro / Other), outcome, *Status after this*, next follow-up → Log outreach.
- **History timeline:** status changes ("Contacted → Interested"), outreach attempts ("Outreach · Email", with the outcome) and notes, each with date and admin name. Below it, **Add a note**.
- **Details panel** (editable): status, owner, next follow-up, name, email, LinkedIn, company, role, discovery source, referrer, "why we hold this record". Save details. **Archive / Unarchive** (not for do-not-contact).
- **The 11 outreach statuses** need distinct but calm badge colors, with "Do not contact" clearly red: Identified, Reviewed, Contacted, Follow-up needed, Interested, Invited, Applied, Approved, Not interested, Not a fit, Do not contact.

### 9.6 CSV import `/admin/prospects/import` (screenshot 25)
- **Instructions:**
  - Recognized columns: name, email, company, role, linkedInUrl, discoverySource, referrerName, referrerEmail.
  - Each row needs a name + an email or LinkedIn URL.
  - Max 2,000 rows / 1 MB.
  - Duplicates and do-not-contact people are skipped.
  - You'll see a preview before anything is saved.
- **Step 1:** choose file → **Preview**.
- **Step 2: preview.**
  - Summary notice: "Preview: nothing has been saved yet. **3 to import** · 4 skipped · 2 with errors".
  - Button: **Import 3 people**.
  - A per-row table: Row #, Name, Email, Result badge (*Will import* / *Duplicate* / *Do not contact* / *Member* / *Error*), Details ("Appears earlier in this file", "Already tracked", "'x' is not a valid email").
- **Step 3: done.** "Import complete. 3 imported…", the table with *Imported* badges, and "View potential members".
- **File errors:** "The file is larger than 1 MB…", "…more than 2,000 rows…", "The first row must be a header with at least a 'name' column…", "The file has no data rows."

### 9.7 Follow-ups `/admin/follow-ups`
- **Toggle:** *Due now* / *Next 7 days*.
- **List:** name (link), role · company · owner, status badge, and the date. "Overdue: Sep 25" in red, "Today: Sep 28" emphasized.
- **Empty:** "All caught up".

### 9.8 Invitations `/admin/invitations`
- **Intro:** "Invited people skip the approval queue. Links expire after 14 days and work only for the invited email."
- **Invite by email:** an input + Send invitation, with success or error messages ("This person asked not to be contacted." / "This email already has an account.").
- **Table:** Email (+ linked prospect), Status (*pending* / *accepted* / *revoked* / *expired*), Sent, Expires, By, and **Revoke** for pending ones.

### 9.9 Reports `/admin/reports` (screenshot 26)
- **Tabs:** Open / Resolved / Dismissed / All. Open reports are oldest first.
- **Cards:**
  - status badge, reason, date
  - reported member (link, "3 reports total" in red when repeated, status badge if not active; "Name (account deleted)" if they deleted their account)
  - "Reported by X" (shown as "Deleted account" if the reporter later deleted theirs; the report itself is kept)
  - details
  - the reported message quoted, if any
- **Actions:** **Mark resolved** (note: "Record what action was taken…") / **Dismiss** (note). Resolved cards show "Resolved by X on date: note".

### 9.10 Audit log `/admin/audit`
- **Table:** When, Admin, Action (monospace code, e.g. `application.approve`, `member.deactivate`, `admin.grant`, `report.resolved`, `invitation.create`, `prospects.import`), Target (link to the member when applicable), Details (JSON).
- **Pagination:** 50 per page, Newer/Older. You may propose friendlier action labels.

---

## 10. Emails

All emails share one simple layout. We currently use a purple wordmark, a heading, paragraphs, one CTA button, and a footer with the app name, URL and (for notification emails) an **Unsubscribe from these emails** link. Please design one responsive template. It must work in Gmail, Outlook and Apple Mail, and in dark mode.

| Email | Trigger | Heading / key content | CTA | Unsubscribe? |
|---|---|---|---|---|
| Confirm email | Registration | "Welcome, {name}" · confirm to submit application · expires 24h | Confirm email | No |
| Password reset | Forgot password | "Reset your password" · expires 1h · ignore if not you | Choose a new password | No |
| Unusual sign-in | 50 failed logins/hour | "We paused sign-ins to your account" (15 min) | Reset password | No |
| Welcome | Approved / invited | "Welcome to Women Builders, {name}!" · complete your profile | Complete your profile | No |
| Application update | Rejected | Neutral thanks · can re-apply in 90 days | — | No |
| Invitation | Admin invites | "You're invited to Women Builders" · from {admin} · expires 14 days | Accept invitation | No |
| Account deactivated | Admin deactivates | Deactivated by an administrator · reply if a mistake | — | No |
| Connection request | New request | "{name} wants to connect" + their note in quotes | View request | Yes |
| Request accepted | Accepted | "You're now connected with {name}" | Send a message | Yes |
| New message | Message received (max 1 per conversation per 30 min, skipped if already read) | "{name} sent you a message" + preview (≤200 chars) | Reply | Yes |

---

## 11. Components inventory

Please spec each component with its states: default, hover, focus, active, disabled, loading, error.

1. **Buttons:** primary, secondary, danger, ghost/link. Min height 44px. Loading label ("Logging in…").
2. **Form fields:** text, email, password, number, date, textarea (with an optional counter "123/500"), select, checkbox, toggle, **tag/chip input**, file input. Labels, required marker, hint text, inline error, invalid border.
3. **Member card** (used in Discover, For you, Connections, Requests, Home):
   - avatar, name (link), headline (2 lines max), company · location
   - role badges, up to 6 expertise tags, connection-status badge
   - a flexible body slot (reasons / note / dates) and a footer action slot
4. **Recommendation reason row:** icon + text per reason type (6.4).
5. **Avatar:** initials (1–2 letters) at 36 / 40 / 48 / 72px. Plan for photos later. Plus a **"Deleted account" ghost variant** (neutral, no initials).
6. **Badges:** role (primary vs secondary), connection status, account status, outreach status (11), report status, invitation status, counts (nav).
7. **Notices/alerts:** info, success, warning, error (inline banners, polite live regions).
8. **Completeness meter:** % label, progress bar, "ready" vs "not yet" state, list of required and missing fields.
9. **Dialog/modal:** title, close ×, body, footer actions. Variants: confirm, confirm with note, form (report, connect).
10. **"More options" menu:** a dropdown or kebab menu for Report/Block (currently a disclosure).
11. **Empty state:** title + helper text + optional link.
12. **Pagination:** previous / "Page x of y" / next.
13. **Navigation:** member top nav + mobile pattern, admin side nav, badges, current page.
14. **Message bubble:** mine / theirs, timestamp, "Read", sending, failed + retry, per-message menu (Report).
15. **Composer:** textarea + send button, disabled state, error line, read-only notice replacement.
16. **Conversation row:** avatar, name, time, preview, unread badge, read-only tag.
17. **Stat tile:** label, big number, sub-label, clickable.
18. **Bar chart:** 12 monthly bars with values and month labels (accessible text alternative).
19. **Data table:** header, rows, row link, badges in cells, horizontal scroll on small screens.
20. **Timeline:** dated entries with type label and author.
21. **Filter panel/bar:** member search (sidebar) and admin prospects (horizontal grid).
22. **Stepper:** onboarding progress (4 steps).
23. **Toast/flash:** "Saved", "Connection request sent."

---

## 12. Content, data and limits reference

### Profile fields
| Section | Field | Type | Limit / options | Hideable? |
|---|---|---|---|---|
| Basics | Full name | text | 2–100 | No |
| | Headline | text | ≤120 | No |
| | Primary role | single choice | Founder, Operator, Investor, Builder | No |
| | Other roles | multi choice | the other 3 | No |
| | Location | text | ≤100, "City, country" | **Yes** |
| | LinkedIn profile | URL | any linkedin.com/in/… | **Yes** |
| | Website | URL | ≤300 | **Yes** |
| About | Expertise areas | tags | ≤20 | No |
| | Professional background | long text | ≤5,000 | **Yes** |
| | Current focus | long text | ≤1,000 | **Yes** |
| Needs & offers | What you need | long text | ≤2,000 | **Yes** |
| | What you can offer | long text | ≤2,000 | **Yes** |
| Founder | Company name (req.) | text | ≤120 | **Yes** |
| | Company stage (req.) | choice | Idea, Pre-seed, Seed, Series A, Series B, Series C+, Bootstrapped, Public | No |
| | Industry | text | ≤80 | No |
| | Funding status | choice | Not raising, Raising now, Raising in 6 months, Recently closed a round | **Yes** |
| Operator | Function (req.) | choice | Engineering, Product, Design, Marketing, Sales, Operations, Finance, People / HR, Legal, Data, Customer Success, Other | No |
| | Seniority (req.) | choice | Individual contributor, Manager, Director, VP, C-level, Advisor | No |
| | Operational focus areas | tags | ≤20 | No |
| Investor | Investment stages (req.) | multi choice | Pre-seed, Seed, Series A, Series B, Growth | No |
| | Check size min/max (req.) | numbers | USD thousands; shown as "$25K–$100K", "$1.5M" | **Yes** (together) |
| | Sectors | tags | ≤20 | No |
| Builder | Technical skills (req.) | tags | ≤30 | No |
| | Project types | tags | ≤20 | No |
| | Collaboration interests | long text | ≤1,000 | No |

"(req.)" = required only when it's the member's **primary** role (it counts towards completeness for any held role).

### Other limits and timings
| Thing | Value |
|---|---|
| Connection request note | 0–500 characters |
| Message | 1–5,000 characters |
| Report details | ≤2,000 characters |
| Application statement | 20–2,000 characters |
| Connection request expiry | 30 days |
| "Not now" on a recommendation | hidden 30 days |
| Invitation link | 14 days, single use |
| Email confirmation link | 24 hours |
| Password reset link | 1 hour |
| Re-apply after rejection | 90 days |
| Session length | 30 days |
| Message delivery while conversation open | ≤ ~3 seconds |
| Unread badge refresh | 30 seconds |
| Directory page size | 20 (max 50) |
| Recommendations shown | up to 20 |

---

## 13. Accessibility, responsive and technical constraints

- **WCAG 2.1 AA:**
  - contrast ≥4.5:1 for text and ≥3:1 for large text and UI components
  - visible focus rings
  - never rely on color alone (status badges need text; overdue needs a word, not just red)
- **Touch targets** of at least 44×44px, with ≥8px between tappable elements.
- **Keyboard:** everything reachable, logical order, a skip link ("Skip to main content") exists, and modals trap focus and restore it on close.
- **Screen readers:** meaningful labels on icon buttons ("Remove fintech", "Close"), live regions for save status and new messages, and text alternatives for charts.
- **Breakpoints:** mobile 320–639 (single column), tablet 640–1023 (2 columns), desktop 1024+ (3-column grids, persistent filter sidebar).
- **No hover-only features.** Hover can enhance, but every action must be reachable by tap and keyboard (e.g. "Report message").
- **Fonts:** the app ships a strict Content Security Policy. Fonts must be **self-hosted**: no Google Fonts CDN or third-party scripts. Please pick fonts with a web license we can self-host.
- **Images:** there are no user-uploaded photos in this release (initials avatars). Decorative illustrations are fine if provided as files (SVG preferred).
- **Tech:** React / Next.js + Tailwind CSS. Plain CSS effects are all feasible. Please avoid designs that need heavy JS animation libraries.

---

## 14. Voice and copy

- **Warm, direct, respectful.** Short sentences. Address the member as "you". Use first names for other members ("Priya won't be notified").
- **Never shame or alarm.** Limits and errors explain what happened and what to do next.
- **Safety copy is reassuring and factual** (see the Block and Report dialogs above).
- **Microcopy already in the product** (keep it or improve it, but keep the meaning):
  - "Our team reads every application."
  - "Be specific: 'intros to seed fintech investors' beats 'help'."
  - "🔒 Mei shares some details only with connections."
  - "Priya won't be notified if you decline."
  - "This is the start of your conversation with Priya."

---

## 15. Open design questions

These are ours to decide together; your recommendation is welcome.

1. **Brand:** name treatment, logo, palette (the current purple is a placeholder), photography/illustration style.
2. **Dark mode:** nice to have. Is it worth doing in v1?
3. **Mobile navigation:** confirm the pattern (bottom tabs vs. menu) and which 4–5 destinations are primary.
4. **Role color coding:** should the 4 roles have their own colors? If yes, keep them accessible and non-hierarchical.
5. **Landing page scope:** a simple login/apply page, or a fuller marketing page?
6. **Recommendation cards vs. search result cards:** same component or distinct?
7. **Message report affordance on mobile:** long-press, kebab, or swipe?
8. **Admin density:** a compact table mode?

---

## 16. Glossary

| Term | Meaning |
|---|---|
| Member | An approved, active account with a profile |
| Applicant | Someone who applied and is waiting for review |
| Potential member / prospect | A person the team wants to recruit (admin-only CRM record; not an account) |
| Connection | Two members who accepted each other; can message |
| Connection request | An invitation to connect, optional note, expires in 30 days |
| Primary / secondary role | Main role / additional roles a member holds |
| Needs / offerings | What a member is looking for / can help with. Drives matching |
| Completeness | Profile score 0–100%; 60% + required fields unlock sending requests |
| Hidden field | A profile detail visible only to connections |
| Deleted account | An account the person erased. Name, email and profile are gone; their conversations stay for the other person, shown as "Deleted account" and read-only |
| Block | Mutual invisibility + no contact; silent |
| Report | A confidential safety report reviewed by admins |
| Do not contact (DNC) | A prospect who asked never to be contacted; kept forever as suppression |
| Invitation | Admin-sent link that skips the approval queue |
| Follow-up | A date an admin should next reach out to a prospect |

---

### Screenshot index (`docs/handoff-screens/`), current placeholder UI, for structure only
| File | Screen |
|---|---|
| 01-landing | Landing |
| 02-apply | Apply to join |
| 03-login | Log in |
| 04-pending | Application under review |
| 06-home | Member home |
| 07-discover | Discover (search + filters) |
| 08-for-you | Recommendations |
| 09-member-profile-connected | Profile of a connection |
| 10-member-profile-not-connected | Profile of a stranger (Connect button; this demo member hides nothing, so the lock notice isn't shown) |
| 11-connections | Connections |
| 12-requests | Requests |
| 13-inbox | Inbox |
| 14-conversation | Conversation |
| 15-edit-profile | Edit profile |
| 16-settings | Settings |
| 17-mobile-for-you | Mobile, showing the broken placeholder nav |
| 20–26 | Admin: dashboard, applications, members, prospects, prospect detail, import, reports |
