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
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
<p style="font-weight:700;color:#6d28d9">${escapeHtml(APP_NAME)}</p>
<h1 style="font-size:20px">${escapeHtml(heading)}</h1>
${paragraphs.map((p) => `<p style="line-height:1.5">${escapeHtml(p)}</p>`).join('\n')}
${cta ? `<p><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(cta.label)}</a></p>` : ''}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#666">${escapeHtml(APP_NAME)} · ${escapeHtml(appUrl())}${
    unsubscribeUrl
      ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#666">Unsubscribe from these emails</a>`
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

export const templates = {
  verifyEmail: (name: string, url: string) =>
    layout({
      subject: `Confirm your email for ${APP_NAME}`,
      heading: `Welcome, ${name}`,
      paragraphs: [
        'Please confirm your email address to submit your application. This link expires in 24 hours.',
      ],
      cta: { label: 'Confirm email', url },
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
  applicationRejected: (name: string) =>
    layout({
      subject: `An update on your ${APP_NAME} application`,
      heading: `Thank you, ${name}`,
      paragraphs: [
        "Thank you for applying. We aren't able to offer membership right now.",
        'You are welcome to apply again in 90 days.',
      ],
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
  newMessage: (fromName: string, fromId: string, preview: string, unsubscribeUrl: string) =>
    layout({
      subject: `New message from ${fromName}`,
      heading: `${fromName} sent you a message`,
      paragraphs: [preview.length > 200 ? `${preview.slice(0, 200)}…` : preview],
      cta: { label: 'Reply', url: `${appUrl()}/messages/${fromId}` },
      unsubscribeUrl,
    }),
};
