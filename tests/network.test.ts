import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  declineConnectionRequest,
  expireConnectionRequests,
  listConnections,
  listRequests,
  removeConnection,
  sendConnectionRequest,
} from '@/lib/services/connections';
import { blockMember, reportMember, unblockMember } from '@/lib/services/safety';
import { getConversation, listConversations, markConversationRead, sendMessage } from '@/lib/services/messaging';
import { connectionStatus } from '@/lib/services/relationships';
import { processOutbox } from '@/lib/email/outbox';
import { resetDb } from './helpers';
import { COMPLETE_FOUNDER, createMember } from './factories';

beforeEach(resetDb);
const ready = () => createMember({ profile: COMPLETE_FOUNDER });

describe('connection requests (Req 3, G1, G2, G6)', () => {
  it('sends, notifies, and only the receiver can accept', async () => {
    const a = await ready();
    const b = await ready();
    const c = await ready();
    const res = await sendConnectionRequest(a.id, b.id, 'Hi!');
    expect(res.status).toBe('sent');
    const id = (res as { requestId: string }).requestId;
    expect(await prisma.emailOutbox.count({ where: { kind: 'connection_request' } })).toBe(1);

    await expect(acceptConnectionRequest(c.id, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(acceptConnectionRequest(a.id, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(declineConnectionRequest(c.id, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(cancelConnectionRequest(b.id, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await acceptConnectionRequest(b.id, id);
    expect(await connectionStatus(prisma, a.id, b.id)).toBe('connected');
    expect(await prisma.emailOutbox.count({ where: { kind: 'connection_accepted' } })).toBe(1);
  });

  it('requires a complete-enough profile', async () => {
    const incomplete = await createMember();
    const b = await ready();
    await expect(sendConnectionRequest(incomplete.id, b.id)).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' });
  });

  it('enforces 20 requests per rolling 24h, even under concurrency', async () => {
    const a = await ready();
    const targets = await Promise.all(Array.from({ length: 22 }, () => createMember()));
    const results = await Promise.allSettled(targets.map((t) => sendConnectionRequest(a.id, t.id)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(20);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected.every((r) => r.reason.code === 'RATE_LIMITED')).toBe(true);
  });

  it('allows only one pending request per pair and auto-connects crossing requests', async () => {
    const a = await ready();
    const b = await ready();
    await sendConnectionRequest(a.id, b.id);
    await expect(sendConnectionRequest(a.id, b.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await sendConnectionRequest(b.id, a.id)).toEqual({ status: 'connected' });
    expect(await prisma.connection.count()).toBe(1);
  });

  it('never creates two connection rows for one pair, even with concurrent crossing requests', async () => {
    const a = await ready();
    const b = await ready();
    await Promise.allSettled([sendConnectionRequest(a.id, b.id), sendConnectionRequest(b.id, a.id)]);
    expect(await prisma.connection.count()).toBeLessThanOrEqual(1);
    expect(await prisma.connectionRequest.count({ where: { status: 'PENDING' } })).toBeLessThanOrEqual(1);
  });

  it('declines silently: the sender still sees "pending" and gets no signal on retry', async () => {
    const a = await ready();
    const b = await ready();
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await declineConnectionRequest(b.id, requestId);
    expect(await connectionStatus(prisma, a.id, b.id)).toBe('pending_sent');
    expect((await listRequests(a.id)).outgoing).toHaveLength(1);
    expect((await listRequests(b.id)).incoming).toHaveLength(0);
    await expect(sendConnectionRequest(a.id, b.id)).rejects.toMatchObject({ message: 'You already have a pending request to this member.' });
    expect(await prisma.emailOutbox.count({ where: { to: a.email } })).toBe(0);
  });

  it('allows a new request after expiry, and applies the same cooldown after cancelling', async () => {
    const a = await ready();
    const b = await ready();
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await cancelConnectionRequest(a.id, requestId);
    await expect(sendConnectionRequest(a.id, b.id)).rejects.toMatchObject({ code: 'REQUEST_COOLDOWN' });
    await prisma.connectionRequest.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await sendConnectionRequest(a.id, b.id)).status).toBe('sent');
  });

  it('expires old pending requests', async () => {
    const a = await ready();
    const b = await ready();
    await sendConnectionRequest(a.id, b.id);
    await prisma.connectionRequest.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireConnectionRequests()).toBe(1);
    expect(await connectionStatus(prisma, a.id, b.id)).toBe('none');
  });

  it('lists connections with search and supports removal', async () => {
    const a = await ready();
    const b = await createMember({ name: 'Priya Raman', profile: { primaryRole: 'INVESTOR', expertiseAreas: ['fintech'] } });
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await acceptConnectionRequest(b.id, requestId);
    expect((await listConnections(a.id, 'fintech')).map((c) => c.member.name)).toEqual(['Priya Raman']);
    expect(await listConnections(a.id, 'nothing')).toHaveLength(0);
    await removeConnection(a.id, b.id);
    expect(await listConnections(a.id)).toHaveLength(0);
  });
});

describe('blocking and reporting (Req 21, G9)', () => {
  it('block removes the connection, cancels requests, hides the pair and disables messaging', async () => {
    const a = await ready();
    const b = await ready();
    const c = await ready();
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await acceptConnectionRequest(b.id, requestId);
    await sendConnectionRequest(c.id, a.id);
    await blockMember(a.id, b.id);
    await blockMember(a.id, c.id);
    expect(await prisma.connection.count({ where: { removedAt: null } })).toBe(0);
    expect(await prisma.connectionRequest.count({ where: { status: 'PENDING' } })).toBe(0);
    await expect(sendMessage(b.id, a.id, 'hello?')).rejects.toMatchObject({ code: 'CANNOT_MESSAGE' });
    await expect(sendConnectionRequest(b.id, a.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await listConversations(b.id)).toHaveLength(0);

    await unblockMember(a.id, b.id);
    expect(await connectionStatus(prisma, a.id, b.id)).toBe('none');
  });

  it('reports a member and snapshots only messages they sent to the reporter', async () => {
    const a = await ready();
    const b = await ready();
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await acceptConnectionRequest(b.id, requestId);
    const mine = await sendMessage(a.id, b.id, 'my message');
    const theirs = await sendMessage(b.id, a.id, 'rude message');
    await expect(reportMember(a.id, { memberId: b.id, reason: 'HARASSMENT', messageId: mine.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await reportMember(a.id, { memberId: b.id, reason: 'HARASSMENT', details: 'See message', messageId: theirs.id });
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toMatchObject({ status: 'OPEN', messageExcerpt: 'rude message' });
  });
});

describe('messaging (Req 4, G12)', () => {
  async function connected() {
    const a = await ready();
    const b = await ready();
    const { requestId } = (await sendConnectionRequest(a.id, b.id)) as { requestId: string };
    await acceptConnectionRequest(b.id, requestId);
    return { a, b };
  }

  it('requires a connection', async () => {
    const a = await ready();
    const b = await ready();
    await expect(sendMessage(a.id, b.id, 'hi')).rejects.toMatchObject({ code: 'CANNOT_MESSAGE' });
  });

  it('delivers in order, tracks unread and only the receiver can mark read', async () => {
    const { a, b } = await connected();
    await sendMessage(a.id, b.id, 'one');
    await sendMessage(a.id, b.id, 'two');
    const conv = await getConversation(b.id, a.id);
    expect(conv.messages.map((m) => m.content)).toEqual(['one', 'two']);
    expect((await listConversations(b.id))[0]?.unreadCount).toBe(2);
    expect((await markConversationRead(a.id, b.id)).marked).toBe(0); // a is not the receiver
    expect((await markConversationRead(b.id, a.id)).marked).toBe(2);
    const after = await getConversation(b.id, a.id, { after: conv.messages[0]!.id });
    expect(after.messages.map((m) => m.content)).toEqual(['two']);
  });

  it('coalesces message emails and skips them once read', async () => {
    const { a, b } = await connected();
    await sendMessage(a.id, b.id, 'one');
    await sendMessage(a.id, b.id, 'two');
    expect(await prisma.emailOutbox.count({ where: { kind: 'new_message' } })).toBe(1);
    await markConversationRead(b.id, a.id);
    await prisma.emailOutbox.updateMany({ where: { kind: 'new_message' }, data: { nextAttemptAt: new Date() } });
    await processOutbox();
    const email = await prisma.emailOutbox.findFirstOrThrow({ where: { kind: 'new_message' } });
    expect(email.lastError).toMatch(/skipped/);
  });

  it('respects email preferences', async () => {
    const { a, b } = await connected();
    await prisma.notificationPreference.update({ where: { userId: b.id }, data: { newMessage: false } });
    await sendMessage(a.id, b.id, 'hi');
    expect(await prisma.emailOutbox.count({ where: { kind: 'new_message' } })).toBe(0);
  });

  it('caps unanswered messages per conversation', async () => {
    const { a, b } = await connected();
    for (let i = 0; i < 20; i++) await sendMessage(a.id, b.id, `m${i}`);
    await expect(sendMessage(a.id, b.id, 'one more')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await sendMessage(b.id, a.id, 'reply');
    await expect(sendMessage(a.id, b.id, 'thanks')).resolves.toBeTruthy();
  });

  it('becomes read-only after removal or deactivation', async () => {
    const { a, b } = await connected();
    await sendMessage(a.id, b.id, 'hello');
    await removeConnection(b.id, a.id);
    const conv = await getConversation(a.id, b.id);
    expect(conv.state).toMatchObject({ canSend: false, reason: 'removed' });
    expect(conv.messages).toHaveLength(1);
    await expect(sendMessage(a.id, b.id, 'still there?')).rejects.toMatchObject({ code: 'CANNOT_MESSAGE' });
  });

  it('rejects over-long messages', async () => {
    const { a, b } = await connected();
    await expect(sendMessage(a.id, b.id, 'x'.repeat(5001))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
