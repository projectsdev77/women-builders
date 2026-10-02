import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { deactivateSelf, deleteAccount, exportMemberData } from '@/lib/services/data-rights';
import { attemptLogin } from '@/lib/auth/login';
import { reportMember } from '@/lib/services/safety';
import { createSession, findSessionUser } from '@/lib/auth/session';
import { getMemberProfile } from '@/lib/services/profiles';
import { searchMembers, searchQuerySchema } from '@/lib/services/discovery';
import { getConversation, listConversations, sendMessage } from '@/lib/services/messaging';
import { register } from '@/lib/services/accounts';
import { pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

beforeEach(resetDb);

describe('data rights (Req 25, G11)', () => {
  it('exports without secrets', async () => {
    const u = await createMember();
    const data = await exportMemberData(u.id);
    expect(data.account.email).toBe(u.email);
    expect(JSON.stringify(data)).not.toContain('passwordHash');
  });

  it('self-deactivation hides the member and login offers reactivation', async () => {
    const u = await createMember();
    await expect(deactivateSelf(u.id, 'wrong')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await deactivateSelf(u.id, TEST_PASSWORD);
    await expect(attemptLogin({ email: u.email, password: TEST_PASSWORD, ip: '1.1.1.1' })).resolves.toEqual({ ok: false, code: 'REACTIVATION_AVAILABLE' });
  });

  it('deletion erases the person but keeps conversations, shown as "Deleted account"', async () => {
    const a = await createMember();
    const b = await createMember({ name: 'Bad Actor', profile: { headline: 'Secret headline', location: 'Paris' } });
    const c = await prisma.connection.create({ data: pair(a.id, b.id) });
    await prisma.message.create({ data: { connectionId: c.id, senderId: b.id, receiverId: a.id, content: 'hi from b' } });
    await prisma.message.create({ data: { connectionId: c.id, senderId: a.id, receiverId: b.id, content: 'hi from a' } });
    await reportMember(a.id, { memberId: b.id, reason: 'HARASSMENT' });
    const token = await createSession(b.id);

    await deleteAccount(b.id, TEST_PASSWORD);

    // Everything identifying is gone...
    const shell = await prisma.user.findUniqueOrThrow({ where: { id: b.id }, include: { profile: true, notificationPreference: true } });
    expect(shell).toMatchObject({ accountStatus: 'DELETED', name: 'Deleted account', isAdmin: false });
    expect(shell.email).toBe(`deleted-${b.id}@deleted.invalid`);
    expect(shell.profile).toBeNull();
    expect(shell.notificationPreference).toBeNull();
    expect(await findSessionUser(token)).toBeNull();
    // ...the person can no longer log in, and can't be found by other members.
    await expect(attemptLogin({ email: b.email, password: TEST_PASSWORD, ip: '1.1.1.1' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(getMemberProfile(a.id, b.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await searchMembers(a.id, searchQuerySchema.parse({}))).results).toHaveLength(0);

    // The other person keeps the whole conversation, from "Deleted account", read-only.
    const conv = await getConversation(a.id, b.id);
    expect(conv.messages.map((m) => m.content)).toEqual(['hi from b', 'hi from a']);
    expect(conv.other).toMatchObject({ name: 'Deleted account', headline: null, active: false });
    expect(conv.state).toMatchObject({ canSend: false, reason: 'deleted' });
    await expect(sendMessage(a.id, b.id, 'are you there?')).rejects.toMatchObject({ code: 'CANNOT_MESSAGE' });
    const list = await listConversations(a.id);
    expect(list[0]).toMatchObject({ member: { name: 'Deleted account' }, readOnly: true });

    // Reports are kept for accountability.
    expect(await prisma.report.findFirstOrThrow()).toMatchObject({ reportedUserName: 'Bad Actor', reporterId: a.id });
  });

  it('frees the email address for a fresh registration', async () => {
    const u = await createMember({ email: 'back@example.com' });
    await deleteAccount(u.id, TEST_PASSWORD);
    const res = await register({
      email: 'back@example.com', password: 'GoodPass123', name: 'Back Again', primaryRole: 'BUILDER',
      headline: 'Engineer', applicationStatement: 'Coming back to the community to build things.',
    });
    expect(res.userId).not.toBe(u.id);
  });

  it('the last admin cannot delete their account', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await expect(deleteAccount(admin.id, TEST_PASSWORD)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
