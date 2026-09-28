import type { Tx } from '@/lib/db';
import { prisma } from '@/lib/db';
import { log } from '@/lib/log';
import type { EmailContent } from './templates';

const MAX_ATTEMPTS = 5;

export interface EnqueueInput {
  to: string;
  kind: string;
  content: EmailContent;
  dedupeKey?: string;
  unsubscribeUrl?: string;
}

/**
 * Writes an email to the durable outbox, ideally inside the caller's transaction
 * so the email exists if and only if the event happened (G12).
 */
export async function enqueueEmail(db: Tx, input: EnqueueInput) {
  return db.emailOutbox.create({
    data: {
      to: input.to,
      kind: input.kind,
      subject: input.content.subject,
      html: input.content.html,
      text: input.content.text,
      dedupeKey: input.dedupeKey,
      unsubscribeUrl: input.unsubscribeUrl,
    },
  });
}

async function deliver(email: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string | null;
}): Promise<void> {
  if (process.env.VITEST) return; // tests assert against the outbox table
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    log.info('email (console transport)', { to: email.to, subject: email.subject, text: email.text });
    return;
  }
  const headers: Record<string, string> = {};
  if (email.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${email.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Message emails are skipped when the recipient has already read the conversation (G12). */
async function alreadyRead(dedupeKey: string | null): Promise<boolean> {
  if (!dedupeKey?.startsWith('msg:')) return false;
  const [, connectionId, receiverId, senderId] = dedupeKey.split(':');
  const unread = await prisma.message.count({
    where: { connectionId, receiverId, senderId, readAt: null },
  });
  return unread === 0;
}

/** Sends due emails with exponential backoff. Called by cron and after enqueue. */
export async function processOutbox(limit = 25): Promise<{ sent: number; failed: number }> {
  const due = await prisma.emailOutbox.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const email of due) {
    // Claim the row so concurrent workers don't double-send.
    const claimed = await prisma.emailOutbox.updateMany({
      where: { id: email.id, status: 'PENDING', attempts: email.attempts },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;
    try {
      if (await alreadyRead(email.dedupeKey)) {
        await prisma.emailOutbox.update({
          where: { id: email.id },
          data: { status: 'SENT', sentAt: new Date(), lastError: 'skipped: messages already read' },
        });
        continue;
      }
      await deliver(email);
      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date(), lastError: null },
      });
      sent++;
    } catch (err) {
      const attempts = email.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: giveUp ? 'FAILED' : 'PENDING',
          lastError: err instanceof Error ? err.message : String(err),
          nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
        },
      });
      failed++;
      log.error('email delivery failed', err, { emailId: email.id, attempts });
    }
  }
  return { sent, failed };
}

/** Best-effort immediate send after a request; the cron job retries failures. */
export function kickOutbox(): void {
  if (process.env.VITEST) return;
  processOutbox().catch((err) => log.error('outbox kick failed', err));
}
