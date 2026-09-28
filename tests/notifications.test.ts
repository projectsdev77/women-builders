import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { unsubscribe, unsubscribeUrl } from '@/lib/services/notifications';
import { enqueueEmail, processOutbox } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { resetDb } from './helpers';
import { createMember } from './factories';

beforeEach(resetDb);

describe('unsubscribe links (Req 16.6)', () => {
  it('turns off exactly one notification type and rejects tampered tokens', async () => {
    const u = await createMember();
    const token = new URL(unsubscribeUrl(u.id, 'new_message')).searchParams.get('token')!;
    expect(await unsubscribe(`${token}x`)).toBeNull();
    expect(await unsubscribe(token)).toBe('new_message');
    const prefs = await prisma.notificationPreference.findUniqueOrThrow({ where: { userId: u.id } });
    expect(prefs).toMatchObject({ newMessage: false, connectionRequest: true, connectionAccepted: true });
  });
});

describe('outbox (G12)', () => {
  it('marks emails sent and escapes user content in HTML', async () => {
    const content = templates.connectionRequest('<script>alert(1)</script>', 'hi <b>there</b>', 'https://x/unsub');
    expect(content.html).not.toContain('<script>');
    expect(content.html).toContain('&lt;script&gt;');
    await enqueueEmail(prisma, { to: 'a@example.com', kind: 'test', content });
    expect(await processOutbox()).toEqual({ sent: 1, failed: 0 });
    expect((await prisma.emailOutbox.findFirstOrThrow()).status).toBe('SENT');
  });
});
