import type { Tx } from '@/lib/db';
import { appUrl } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates, type EmailContent } from '@/lib/email/templates';
import { sign, verifySigned } from '@/lib/security/tokens';
import { prisma } from '@/lib/db';

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'new_message'
  | 'investing_checkin'
  | 'introduction'
  | 'gathering_nearby'
  | 'win_confirmation'
  | 'win_prompt';

const PREF_FIELD = {
  connection_request: 'connectionRequest',
  connection_accepted: 'connectionAccepted',
  new_message: 'newMessage',
  investing_checkin: 'investingCheckins',
  introduction: 'introductions',
  gathering_nearby: 'gatheringsNearMe',
  win_confirmation: 'winConfirmations',
  win_prompt: 'winPrompts',
} as const;

/** One-click unsubscribe link for a single notification type (Req 16.6). */
export function unsubscribeUrl(userId: string, type: NotificationType): string {
  return `${appUrl()}/api/notifications/unsubscribe?token=${encodeURIComponent(sign(`${userId}:${type}`))}`;
}

export async function unsubscribe(token: string): Promise<NotificationType | null> {
  const payload = verifySigned(token);
  if (!payload) return null;
  const [userId, type] = payload.split(':') as [string, NotificationType];
  if (!userId || !(type in PREF_FIELD)) return null;
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, [PREF_FIELD[type]]: false },
    update: { [PREF_FIELD[type]]: false },
  });
  return type;
}

/** Enqueues a notification email if the recipient is active and opted in (Req 16.5). */
export async function notify(
  tx: Tx,
  userId: string,
  type: NotificationType,
  build: (unsubscribe: string) => EmailContent,
  opts: { dedupeKey?: string; delayMs?: number } = {},
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true, accountStatus: true, notificationPreference: true },
  });
  if (!user || user.accountStatus !== 'ACTIVE') return;
  const pref = user.notificationPreference;
  if (pref && !pref[PREF_FIELD[type]]) return;
  const unsub = unsubscribeUrl(userId, type);
  if (opts.dedupeKey && (await tx.emailOutbox.count({ where: { dedupeKey: opts.dedupeKey } }))) return;
  const row = await enqueueEmail(tx, {
    to: user.email,
    kind: type,
    content: build(unsub),
    dedupeKey: opts.dedupeKey,
    unsubscribeUrl: unsub,
  });
  if (opts.delayMs) {
    await tx.emailOutbox.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(Date.now() + opts.delayMs) } });
  }
}

export function notifyConnectionRequest(tx: Tx, to: string, fromName: string, message: string | null) {
  return notify(tx, to, 'connection_request', (u) => templates.connectionRequest(fromName, message, u));
}

export function notifyConnectionAccepted(tx: Tx, to: string, byName: string, byId: string) {
  return notify(tx, to, 'connection_accepted', (u) => templates.connectionAccepted(byName, byId, u));
}

export const MESSAGE_EMAIL_DELAY_MS = 2 * 60 * 1000;

/**
 * At most one "new messages" email per conversation per 30 minutes (G12). The email is
 * delayed 2 minutes and skipped at send time if the recipient has already read everything.
 */
export function notifyNewMessage(
  tx: Tx,
  input: { to: string; fromId: string; fromName: string; connectionId: string; preview: string; bucketMs: number },
) {
  const bucket = Math.floor(Date.now() / input.bucketMs);
  return notify(
    tx,
    input.to,
    'new_message',
    (u) => templates.newMessage(input.fromName, input.fromId, input.preview, u),
    { dedupeKey: `msg:${input.connectionId}:${input.to}:${input.fromId}:${bucket}`, delayMs: MESSAGE_EMAIL_DELAY_MS },
  );
}
