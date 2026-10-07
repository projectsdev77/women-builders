import { APP_NAME, appUrl } from '@/lib/config';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutInput {
  subject: string;
  heading: string;
  paragraphs: string[]; // plain text, escaped here
  cta?: { label: string; url: string };
  unsubscribeUrl?: string;
}

function layout({ subject, heading, paragraphs, cta, unsubscribeUrl }: LayoutInput): EmailContent {
  const html = `<!doctype html><html><body style="font-family:Figtree,system-ui,sans-serif;color:#1F3D2B;background:#FBF4EC;max-width:560px;margin:0 auto;padding:28px;line-height:1.55">
<p style="font-family:'Young Serif',Georgia,serif;font-size:22px;margin:0 0 16px">${escapeHtml(APP_NAME.toLowerCase())}<span style="color:#C2557A">.</span></p>
<h1 style="font-size:20px">${escapeHtml(heading)}</h1>
${paragraphs.map((p) => `<p style="line-height:1.5">${escapeHtml(p)}</p>`).join('\n')}
${cta ? `<p><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#1F3D2B;color:#FBF4EC;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none">${escapeHtml(cta.label)}</a></p>` : ''}
<hr style="border:none;border-top:1px solid #EADCCB;margin:24px 0">
<p style="font-size:12px;color:#4D6B58">${escapeHtml(APP_NAME)} · ${escapeHtml(appUrl())}${
    unsubscribeUrl
      ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#4D6B58">Unsubscribe from these emails</a>`
      : ''
  }</p>
</body></html>`;
  const text = [
    heading,
    '',
    ...paragraphs,
    ...(cta ? ['', `${cta.label}: ${cta.url}`] : []),
    '',
    `— ${APP_NAME}`,
    ...(unsubscribeUrl ? [`Unsubscribe: ${unsubscribeUrl}`] : []),
  ].join('\n');
  return { subject, html, text };
}

/** What gathering emails need to describe it (R3 F14). */
export interface GatheringSummary {
  id: string;
  title: string;
  when: string; // already formatted in the gathering's time zone
  where: string; // "Lagos, Nigeria" or "Online"
}
const gatheringUrl = (id: string) => `${appUrl()}/gatherings/${id}`;

export const templates = {
  gatheringNearby: (g: GatheringSummary, unsubscribeUrl: string) =>
    layout({
      subject: `New gathering: ${g.title}`,
      heading: g.title,
      paragraphs: [`${g.when} · ${g.where}`, 'Seats are limited. Have a look and ask for a seat if it suits you.'],
      cta: { label: 'See the gathering', url: gatheringUrl(g.id) },
      unsubscribeUrl,
    }),
  gatheringInvite: (g: GatheringSummary) =>
    layout({
      subject: `You're invited: ${g.title}`,
      heading: `You're invited to ${g.title}`,
      paragraphs: [`${g.when} · ${g.where}`, 'This gathering is by invitation. Let us know if you can come.'],
      cta: { label: 'See the gathering', url: gatheringUrl(g.id) },
    }),
  seatConfirmed: (g: GatheringSummary, venue: string | null) =>
    layout({
      subject: `Your seat is confirmed: ${g.title}`,
      heading: `See you at ${g.title}`,
      paragraphs: [
        `${g.when} · ${g.where}`,
        ...(venue ? [`Where: ${venue}`] : []),
        'You can see who is coming and add it to your calendar on the gathering page. If you can no longer come, please cancel your seat so someone else can have it.',
      ],
      cta: { label: 'Open the gathering', url: gatheringUrl(g.id) },
    }),
  seatWaitlisted: (g: GatheringSummary) =>
    layout({
      subject: `You're on the waitlist: ${g.title}`,
      heading: `You're on the waitlist for ${g.title}`,
      paragraphs: [`${g.when} · ${g.where}`, "We'll email you straight away if a seat opens up."],
      cta: { label: 'Open the gathering', url: gatheringUrl(g.id) },
    }),
  seatDeclined: (g: GatheringSummary) =>
    layout({
      subject: `About ${g.title}`,
      heading: `We couldn't fit you at ${g.title}`,
      paragraphs: ["We couldn't fit you at this one. We'd love to see you at the next."],
      cta: { label: 'See upcoming gatherings', url: `${appUrl()}/gatherings` },
    }),
  gatheringReminder: (g: GatheringSummary, when: 'soon' | 'today', venue: string | null) =>
    layout({
      subject: when === 'today' ? `Today: ${g.title}` : `In two days: ${g.title}`,
      heading: when === 'today' ? `${g.title} is today` : `${g.title} is in two days`,
      paragraphs: [`${g.when} · ${g.where}`, ...(venue ? [`Where: ${venue}`] : []), "Can't make it any more? Please cancel your seat so someone else can come."],
      cta: { label: 'Open the gathering', url: gatheringUrl(g.id) },
    }),
  gatheringChanged: (g: GatheringSummary, venue: string | null) =>
    layout({
      subject: `Updated: ${g.title}`,
      heading: `${g.title} has changed`,
      paragraphs: ['The details of a gathering you are going to have changed. Here they are now:', `${g.when} · ${g.where}`, ...(venue ? [`Where: ${venue}`] : [])],
      cta: { label: 'Open the gathering', url: gatheringUrl(g.id) },
    }),
  gatheringCancelled: (g: GatheringSummary, reason: string) =>
    layout({
      subject: `Cancelled: ${g.title}`,
      heading: `${g.title} is cancelled`,
      paragraphs: [`${g.when} · ${g.where}`, reason, "We're sorry. We hope to see you at another gathering soon."],
      cta: { label: 'See upcoming gatherings', url: `${appUrl()}/gatherings` },
    }),
  seatFreedByDeletion: (g: GatheringSummary) =>
    layout({
      subject: `A seat opened up: ${g.title}`,
      heading: `A confirmed guest left ${g.title}`,
      paragraphs: [`${g.when} · ${g.where}`, 'A confirmed guest deleted her account, so a seat is free. You may want to offer it to someone on the waitlist.'],
      cta: { label: 'Open the request queue', url: `${appUrl()}/admin/gatherings/${g.id}` },
    }),
  gatheringMessage: (g: GatheringSummary, subject: string, body: string) =>
    layout({
      subject: `${g.title}: ${subject}`,
      heading: subject,
      paragraphs: body.split(/\n{2,}/),
      cta: { label: 'Open the gathering', url: gatheringUrl(g.id) },
    }),
  passwordReset: (url: string) =>
    layout({
      subject: `Reset your ${APP_NAME} password`,
      heading: 'Reset your password',
      paragraphs: [
        'Someone asked to reset the password for this account. If it was you, use the link below. It expires in 1 hour.',
        "If it wasn't you, you can ignore this email.",
      ],
      cta: { label: 'Choose a new password', url },
    }),
  suspiciousLogins: () =>
    layout({
      subject: `Unusual sign-in activity on your ${APP_NAME} account`,
      heading: 'We paused sign-ins to your account',
      paragraphs: [
        'We saw many failed attempts to sign in to your account, so we paused sign-ins for 15 minutes.',
        'If this was not you, we recommend resetting your password.',
      ],
      cta: { label: 'Reset password', url: `${appUrl()}/forgot-password` },
    }),
  welcome: (name: string) =>
    layout({
      subject: `You're in: welcome to ${APP_NAME}`,
      heading: `Welcome to ${APP_NAME}, ${name}!`,
      paragraphs: [
        'Your application was approved. Complete your profile so the right people can find you.',
      ],
      cta: { label: 'Complete your profile', url: `${appUrl()}/onboarding` },
    }),
  invitation: (url: string, inviterName?: string) =>
    layout({
      subject: `You're invited to join ${APP_NAME}`,
      heading: `You're invited to ${APP_NAME}`,
      paragraphs: [
        `${inviterName ? `${inviterName} has` : 'We have'} invited you to join ${APP_NAME}, a curated community of women founders, operators, investors and builders.`,
        'This invitation expires in 14 days.',
      ],
      cta: { label: 'Accept invitation', url },
    }),
  requestReceived: (name: string, waitlist: { nextReview: string | null } | null = null) =>
    layout({
      subject: waitlist ? `You're on the ${APP_NAME} waitlist` : `We've received your request to join ${APP_NAME}`,
      heading: `Thank you, ${name}`,
      paragraphs: waitlist
        ? [
            "You're on the waitlist. We review requests in rounds, and every request gets a reply from a person.",
            waitlist.nextReview ? `${waitlist.nextReview}. You'll hear back within three weeks of that, either way.` : "You'll hear back within three weeks of our next review, either way.",
          ]
        : ['We have your request for an invitation. Our team reads every request personally.', "You'll hear back from us within three weeks, either way."],
    }),
  alreadyMember: () =>
    layout({
      subject: `You already have a ${APP_NAME} account`,
      heading: 'You already have an account',
      paragraphs: [
        'Someone asked for an invitation using this email address, but it already belongs to a member account.',
        "If it was you, just log in. If you've forgotten your password, you can reset it. If it wasn't you, you can ignore this email.",
      ],
      cta: { label: 'Log in', url: `${appUrl()}/login` },
    }),
  requestDeclined: (name: string) =>
    layout({
      subject: `An update on your ${APP_NAME} request`,
      heading: `Thank you, ${name}`,
      paragraphs: [
        "Thank you for asking to join. We aren't able to offer membership right now.",
        "You're welcome to ask again in 90 days.",
      ],
    }),
  invitationReminder: (url: string, expiresAt: Date) =>
    layout({
      subject: `Your invitation to ${APP_NAME} is waiting`,
      heading: 'Your invitation is still waiting',
      paragraphs: [
        `You were invited to join ${APP_NAME}. Your invitation expires on ${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`,
        'This link replaces the one in your first invitation email.',
      ],
      cta: { label: 'Accept invitation', url },
    }),
  overdueRequestsDigest: (count: number) =>
    layout({
      subject: `${count} invitation request${count === 1 ? '' : 's'} waiting more than 3 weeks`,
      heading: `${count} request${count === 1 ? ' has' : 's have'} waited more than 3 weeks`,
      paragraphs: ["We promise everyone an answer within three weeks. These requests haven't had a decision yet."],
      cta: { label: 'Open the Requests queue', url: `${appUrl()}/admin/requests` },
    }),
  charterUpdated: (name: string) =>
    layout({
      subject: `We've updated the ${APP_NAME} community charter`,
      heading: `Hi ${name}, our charter has changed`,
      paragraphs: [
        "We've updated the community charter. You'll be asked to read and accept it the next time you visit.",
      ],
      cta: { label: 'Read the charter', url: `${appUrl()}/charter` },
    }),
  photoRemoved: (name: string) =>
    layout({
      subject: `Your ${APP_NAME} profile photo was removed`,
      heading: `Hi ${name}, we removed your profile photo`,
      paragraphs: [
        "Our team removed your profile photo because it didn't meet the community charter.",
        'You can upload a different photo from your profile at any time. Reply to this email if you have questions.',
      ],
      cta: { label: 'Edit your profile', url: `${appUrl()}/profile/edit` },
    }),
  accountDeactivated: () =>
    layout({
      subject: `Your ${APP_NAME} account has been deactivated`,
      heading: 'Your account has been deactivated',
      paragraphs: [
        'An administrator deactivated your account. If you think this is a mistake, reply to this email.',
      ],
    }),
  connectionRequest: (fromName: string, message: string | null, unsubscribeUrl: string) =>
    layout({
      subject: `${fromName} wants to connect on ${APP_NAME}`,
      heading: `${fromName} wants to connect`,
      paragraphs: message ? [`"${message}"`] : ['You have a new connection request.'],
      cta: { label: 'View request', url: `${appUrl()}/connections/requests` },
      unsubscribeUrl,
    }),
  connectionAccepted: (byName: string, byId: string, unsubscribeUrl: string) =>
    layout({
      subject: `${byName} accepted your connection request`,
      heading: `You're now connected with ${byName}`,
      paragraphs: ['You can now message each other directly.'],
      cta: { label: 'Send a message', url: `${appUrl()}/messages/${byId}` },
      unsubscribeUrl,
    }),
  introductionAsked: (requesterName: string, targetName: string, note: string, unsubscribeUrl: string) =>
    layout({
      subject: `${requesterName} asked you for an introduction to ${targetName}`,
      heading: `Would you introduce ${requesterName} to ${targetName}?`,
      paragraphs: [
        `"${note.length > 400 ? `${note.slice(0, 400)}…` : note}"`,
        'You have 14 days to decide. If you pass, nobody is told.',
      ],
      cta: { label: 'Review the request', url: `${appUrl()}/introductions?tab=asked` },
      unsubscribeUrl,
    }),
  introduced: (introducerLabel: string, requesterName: string, unsubscribeUrl: string) =>
    layout({
      subject: `${introducerLabel} would like to introduce you to ${requesterName}`,
      heading: `${introducerLabel} would like to introduce you to ${requesterName}`,
      paragraphs: ['Read their notes and decide within 14 days. If you say "not now", nobody is told.'],
      cta: { label: 'See the introduction', url: `${appUrl()}/introductions?tab=for-me` },
      unsubscribeUrl,
    }),
  introductionAcceptedRequester: (targetName: string, targetId: string, unsubscribeUrl: string) =>
    layout({
      subject: `You're now connected with ${targetName}`,
      heading: `${targetName} accepted the introduction`,
      paragraphs: ['You are now connected. Your conversation starts with the introduction notes.'],
      cta: { label: 'Send a message', url: `${appUrl()}/messages/${targetId}` },
      unsubscribeUrl,
    }),
  introductionAcceptedIntroducer: (requesterName: string, targetName: string, unsubscribeUrl: string) =>
    layout({
      subject: `Your introduction worked`,
      heading: `${requesterName} and ${targetName} are now connected`,
      paragraphs: ['Thank you for making the introduction. This is how the community grows.'],
      cta: { label: 'Your introductions', url: `${appUrl()}/introductions` },
      unsubscribeUrl,
    }),
  winConfirm: (authorName: string, what: string, unsubscribeUrl: string) =>
    layout({
      subject: `${authorName} shared a win with you`,
      heading: `${authorName} says: ${what}`,
      paragraphs: ['Is that right? Confirming marks the win as verified. If it isn\'t right, decline and nobody is told.'],
      cta: { label: 'Confirm or decline', url: `${appUrl()}/wins` },
      unsubscribeUrl,
    }),
  winPrompt: (question: string, unsubscribeUrl: string) =>
    layout({
      subject: question,
      heading: question,
      paragraphs: [
        'An investment, a hire, an advisor, a customer: if something came of it, share it. You choose whether it stays anonymous, is seen by members, or may be quoted.',
        'Wins are how we show the network works.',
      ],
      cta: { label: 'Share a win', url: `${appUrl()}/wins/new` },
      unsubscribeUrl,
    }),
  investingCheckin: (name: string, unsubscribeUrl: string) =>
    layout({
      subject: 'Are you still investing?',
      heading: `${name}, are you still investing?`,
      paragraphs: [
        'Founders in the Capital view see investors who have confirmed in the last few months first. It takes one click.',
        'If you have paused, say so and founders will know not to expect a reply for now. You can switch back any time.',
      ],
      cta: { label: 'Answer on your Home page', url: `${appUrl()}/dashboard#investing` },
      unsubscribeUrl,
    }),
  newMessage: (fromName: string, fromId: string, preview: string, unsubscribeUrl: string) =>
    layout({
      subject: `New message from ${fromName}`,
      heading: `${fromName} sent you a message`,
      paragraphs: [preview.length > 200 ? `${preview.slice(0, 200)}…` : preview],
      cta: { label: 'Reply', url: `${appUrl()}/messages/${fromId}` },
      unsubscribeUrl,
    }),
};
