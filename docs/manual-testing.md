# Manual testing: only what a person has to check

The automated suite (`npm run e2e`, 90+ checks on desktop and phone sizes) already covers: every public, member and admin page loading; the whole request → invitation → join → onboarding → connect → message journey; admin creating and running a gathering; wins; profile editing; photo upload and access control; throttling, origin checks and cron secrets. **Do not repeat those by hand.**

What is left needs eyes, a real inbox, a real phone or a real opinion. Run these on the deployed site after the automated suite is green.

Sign in as a demo member with `adaeze@demo.womenbuilders.test` / `DemoPass123`, and as admin with your admin account.

## A. Real email (needs a real inbox)

Do this after Resend is verified (deploy guide step 8). Use your own email addresses.

| # | Do | Expect |
|---|---|---|
| A1 | Submit **Request an invitation** with your own address. | Within a minute a "request received" email arrives, in the **inbox** (not spam), from your domain. |
| A2 | As admin, **Send invitation** on that request. | The invitation email arrives with a working button; the link opens the Join page with your email pre-filled. |
| A3 | Open the emails in Gmail **and** Apple Mail or Outlook, on desktop and phone. | Forest/cream colours, readable text, button looks like a button, nothing cut off. |
| A4 | Click **Unsubscribe** in a notification email (send yourself a connection request to trigger one). | The "you're unsubscribed" page shows, and you stop getting that kind of email. |
| A5 | **Forgot password** with your address. | Reset email arrives; the link works once; the old password stops working. |
| A6 | Check the sender's headers (Gmail → Show original). | SPF, DKIM and DMARC all say **PASS**. |

## B. Real phone and real photos

| # | Do | Expect |
|---|---|---|
| B1 | On your phone (Safari on iPhone, Chrome on Android), upload a **photo straight from the camera** on Edit profile. | It uploads (under 4 MB), appears cropped square, and a photo with location data does not reveal it. |
| B2 | Upload a large photo (over 4 MB). | A clear "at most 4 MB" message, no crash. |
| B3 | Use the site on the phone for 5 minutes: Home, Discover, a profile, send a message. | Bottom tab bar works, nothing overlaps, the keyboard does not hide the message box, text is a comfortable size. |
| B4 | Rotate the phone and open the Messages thread. | Layout still usable. |

## C. Does it look right? (design review)

Open each screen next to the designer's screenshots (`designer-guide/…/screenshots`).

| # | Screen | Look for |
|---|---|---|
| C1 | Homepage (desktop and phone) | Hero, rotating badge, role cards, numbers, request form match the design; nothing jumps while loading. |
| C2 | Home, Discover, a member card, a profile | Role colours, serif headings, spacing, avatars with role rings. |
| C3 | Gatherings list and detail | Striped covers, date stamp, seat pills. |
| C4 | Messages thread with an introduction | The lavender introduction card and bubbles. |
| C5 | Admin pages | Dense and readable on a laptop; nav usable on a phone. |
| C6 | The fonts | Young Serif headings, Figtree text. If they look like a default system font, tell Claude. |

## D. Accessibility (needs a person)

| # | Do | Expect |
|---|---|---|
| D1 | Unplug the mouse. Tab through the homepage, login and the request form. | You can reach and use everything; the focus ring is always visible; Esc closes dialogs. |
| D2 | Turn on a screen reader (VoiceOver on Mac/iPhone, TalkBack on Android) for the login and Messages pages. | Fields are announced with their labels; new messages and errors are announced. |
| D3 | Zoom the browser to 200%. | No content lost or overlapping. |
| D4 | Turn on "Reduce motion" in your system settings. | The marquee and rotating badge stop moving. |

## E. Things that depend on time or Vercel

| # | Do | Expect |
|---|---|---|
| E1 | Vercel → **Settings → Cron Jobs** after a day. | Each job shows recent successful runs. |
| E2 | Send a message and check how long the email takes to arrive. | Within about 2 minutes (needs the every-minute outbox timer: cron-job.org on the free plan, Vercel Cron on Pro). |
| E3 | Vercel → **Logs**, filter by errors, after you have clicked around. | No red errors from normal use. |
| E4 | Leave a logged-in tab open for a while, then use it. | You stay signed in during normal use; after a long idle you are sent to login without errors. |
| E5 | Open the site from another country or network (a friend, or mobile data). | Loads fast, photos appear. |

## F. Content and judgement

| # | Check |
|---|---|
| F1 | Read the privacy policy, terms and charter end to end. They are placeholders until you replace them; get them reviewed by your lawyer. |
| F2 | Read the homepage and email wording as a first-time visitor. Is the tone right? Any phrase that overpromises? |
| F3 | Decline path: as admin **Decline** a request for your own address. The email should be kind and say when she can ask again. |
| F4 | Safety: report a message and a member from two accounts. Confirm the report reaches **Admin → Reports**, and the reported person is never told who reported. |
| F5 | Delete account: delete a test account. Its conversations stay for the other person as "Deleted account"; the data export contains what you expect. |

## G. Browsers

Open the homepage, login and a profile once in **Safari** (Mac or iPhone) and **Firefox**. The automated suite only runs Chromium.

---

**Found something?** Note the page, what you did and what you saw (a screenshot helps) and send it to Claude. Anything repeatable will get a new automated test so it stays fixed.
