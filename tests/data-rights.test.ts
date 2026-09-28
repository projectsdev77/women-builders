import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { deactivateSelf, deleteAccount, exportMemberData } from '@/lib/services/data-rights';
import { attemptLogin } from '@/lib/auth/login';
import { reportMember } from '@/lib/services/safety';
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

  it('deletion removes the account and conversations but keeps reports about the member', async () => {
    const a = await createMember();
    const b = await createMember({ name: 'Bad Actor' });
    const c = await prisma.connection.create({ data: pair(a.id, b.id) });
    await prisma.message.create({ data: { connectionId: c.id, senderId: b.id, receiverId: a.id, content: 'hi' } });
    await reportMember(a.id, { memberId: b.id, reason: 'HARASSMENT' });
    await deleteAccount(b.id, TEST_PASSWORD);
    expect(await prisma.user.count({ where: { id: b.id } })).toBe(0);
    expect(await prisma.message.count()).toBe(0);
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toMatchObject({ reportedUserId: null, reportedUserName: 'Bad Actor', reporterId: a.id });
  });

  it('the last admin cannot delete their account', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await expect(deleteAccount(admin.id, TEST_PASSWORD)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
