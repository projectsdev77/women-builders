import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { attemptLogin, INVALID_CREDENTIALS } from '@/lib/auth/login';
import { createSession, findSessionUser } from '@/lib/auth/session';
import { joinWithInvitation, previewInvitation, requestPasswordReset, resetPassword } from '@/lib/services/accounts';
import { createInvitation, sendInvitationReminders } from '@/lib/services/admin/invitations';
import { acceptCharter, sendCharterNotices } from '@/lib/services/charter';
import { homeFor } from '@/lib/auth/guards';
import { CHARTER_VERSION } from '@/content/charter';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { isAllowedOrigin } from '@/lib/security/origin';
import { canonicalLinkedInUrl } from '@/lib/validation/common';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

const base = {
  password: 'GoodPass123',
  name: 'Ada Lovelace',
  primaryRole: 'BUILDER' as const,
  headline: 'Engineer',
  city: 'London',
  country: 'GB',
  acceptCharter: true as const,
};

async function invite(email = 'ada@example.com') {
  const admin = await createMember({ isAdmin: true });
  await createInvitation(admin.id, { email });
  return tokenFromOutbox('invitation', 'invite');
}

async function tokenFromOutbox(kind: string, param: string) {
  const email = await prisma.emailOutbox.findFirstOrThrow({ where: { kind }, orderBy: { createdAt: 'desc' } });
  const m = email.text.match(new RegExp(`${param}=([^\\s]+)`));
  return decodeURIComponent(m![1]!);
}

beforeEach(resetDb);

describe('joining by invitation (R3 F4)', () => {
  it('creates an ACTIVE member with the charter accepted and marks the prospect Joined', async () => {
    const prospect = await prisma.potentialMember.create({ data: { name: 'Ada', email: 'ada@example.com', outreachStatus: 'CONTACTED' } });
    const token = await invite('Ada@Example.com');
    expect(await previewInvitation(token)).toMatchObject({ email: 'ada@example.com', name: 'Ada' });

    const { userId } = await joinWithInvitation({ ...base, invitationToken: token });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    expect(user.accountStatus).toBe('ACTIVE');
    expect(user.email).toBe('ada@example.com');
    expect(user.charterVersion).toBe(CHARTER_VERSION);
    expect(user.profile).toMatchObject({ primaryRole: 'BUILDER', city: 'London', country: 'GB' });
    const p = await prisma.potentialMember.findUniqueOrThrow({ where: { id: prospect.id } });
    expect(p.userId).toBe(userId);
    expect(p.outreachStatus).toBe('APPROVED');
    const history = await prisma.potentialMemberStatusChange.findMany({ where: { potentialMemberId: prospect.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => h.toStatus)).toEqual(['INVITED', 'APPROVED']);
    expect(await prisma.emailOutbox.count({ where: { kind: 'welcome', to: 'ada@example.com' } })).toBe(1);
  });

  it('works once only', async () => {
    const token = await invite();
    await joinWithInvitation({ ...base, invitationToken: token });
    expect(await previewInvitation(token)).toBeNull();
    await expect(joinWithInvitation({ ...base, invitationToken: token })).rejects.toMatchObject({ code: 'INVALID_INVITATION' });
  });

  it('rejects expired and revoked invitations', async () => {
    const token = await invite();
    await prisma.invitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(joinWithInvitation({ ...base, invitationToken: token })).rejects.toMatchObject({ code: 'INVALID_INVITATION' });
    const t2 = await invite('eve@example.com');
    await prisma.invitation.updateMany({ where: { email: 'eve@example.com' }, data: { revokedAt: new Date() } });
    await expect(joinWithInvitation({ ...base, invitationToken: t2 })).rejects.toMatchObject({ code: 'INVALID_INVITATION' });
  });

  it('refuses to invite an existing member or a do-not-contact prospect', async () => {
    const admin = await createMember({ isAdmin: true });
    await createMember({ email: 'ada@example.com' });
    await expect(createInvitation(admin.id, { email: 'ada@example.com' })).rejects.toBeTruthy();
    await prisma.potentialMember.create({ data: { name: 'Eve', email: 'eve@example.com', outreachStatus: 'DO_NOT_CONTACT' } });
    await expect(createInvitation(admin.id, { email: 'eve@example.com' })).rejects.toBeTruthy();
  });

  it('sends one reminder after 7 days with a fresh link; the old link stops working', async () => {
    const token = await invite();
    expect(await sendInvitationReminders()).toBe(0);
    const later = new Date(Date.now() + 8 * 86_400_000);
    expect(await sendInvitationReminders(later)).toBe(1);
    expect(await sendInvitationReminders(later)).toBe(0);
    expect(await previewInvitation(token)).toBeNull();
    const fresh = await tokenFromOutbox('invitation_reminder', 'invite');
    expect(await previewInvitation(fresh)).toMatchObject({ email: 'ada@example.com' });
  });
});

describe('community charter (R3 F2)', () => {
  it('sends members with an older charter to the accept page, once accepted they go home', async () => {
    const u = await createMember({ charterVersion: null });
    const token = await createSession(u.id);
    expect(homeFor((await findSessionUser(token))!)).toBe('/charter/accept');
    await acceptCharter(u.id);
    expect(homeFor((await findSessionUser(token))!)).toBe('/dashboard');
  });

  it('emails each member about a charter update only once', async () => {
    await createMember({ charterVersion: null });
    await createMember();
    expect(await sendCharterNotices()).toBe(1);
    expect(await sendCharterNotices()).toBe(0);
    expect(await prisma.emailOutbox.count({ where: { kind: 'charter_updated' } })).toBe(1);
  });
});

describe('login (G7)', () => {
  it('returns the same error for unknown email and wrong password', async () => {
    await createMember({ email: 'ada@example.com' });
    await expect(attemptLogin({ email: 'nobody@example.com', password: 'x', ip: '1.1.1.1' })).rejects.toMatchObject({
      message: INVALID_CREDENTIALS,
    });
    await expect(attemptLogin({ email: 'ada@example.com', password: 'wrong', ip: '1.1.1.1' })).rejects.toMatchObject({
      message: INVALID_CREDENTIALS,
    });
  });

  it('accepts correct credentials regardless of email case', async () => {
    const u = await createMember({ email: 'ada@example.com' });
    await expect(attemptLogin({ email: 'ADA@example.com', password: TEST_PASSWORD, ip: '1.1.1.1' })).resolves.toEqual({
      ok: true,
      userId: u.id,
    });
  });

  it('throttles one ip after 5 failures without locking the owner out from another ip', async () => {
    await createMember({ email: 'ada@example.com' });
    for (let i = 0; i < 5; i++) {
      await expect(attemptLogin({ email: 'ada@example.com', password: 'bad', ip: '6.6.6.6' })).rejects.toBeTruthy();
    }
    await expect(attemptLogin({ email: 'ada@example.com', password: TEST_PASSWORD, ip: '6.6.6.6' })).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });
    await expect(attemptLogin({ email: 'ada@example.com', password: TEST_PASSWORD, ip: '2.2.2.2' })).resolves.toMatchObject({
      ok: true,
    });
  });

  it('locks the account after 50 failures from many ips and emails the owner', async () => {
    const u = await createMember({ email: 'ada@example.com' });
    await prisma.loginAttempt.createMany({
      data: Array.from({ length: 49 }, (_, i) => ({ email: 'ada@example.com', ip: `10.0.0.${i}`, success: false })),
    });
    await expect(attemptLogin({ email: 'ada@example.com', password: 'bad', ip: '10.0.1.1' })).rejects.toBeTruthy();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).lockedUntil).not.toBeNull();
    expect(await prisma.emailOutbox.count({ where: { kind: 'suspicious_logins' } })).toBe(1);
    // Locked: even the right password gets the generic message.
    await expect(attemptLogin({ email: 'ada@example.com', password: TEST_PASSWORD, ip: '3.3.3.3' })).rejects.toMatchObject({
      message: INVALID_CREDENTIALS,
    });
  });

  it('blocks admin-deactivated accounts but offers self-deactivated ones reactivation', async () => {
    const a = await createMember({ email: 'a@example.com', accountStatus: 'DEACTIVATED' });
    await prisma.user.update({ where: { id: a.id }, data: { deactivatedBy: 'ADMIN' } });
    await expect(attemptLogin({ email: 'a@example.com', password: TEST_PASSWORD, ip: '1.1.1.1' })).rejects.toMatchObject({
      code: 'ACCOUNT_DEACTIVATED',
    });

    const s = await createMember({ email: 's@example.com', accountStatus: 'DEACTIVATED' });
    await prisma.user.update({ where: { id: s.id }, data: { deactivatedBy: 'SELF' } });
    await expect(attemptLogin({ email: 's@example.com', password: TEST_PASSWORD, ip: '1.1.1.1' })).resolves.toEqual({
      ok: false,
      code: 'REACTIVATION_AVAILABLE',
    });
    await attemptLogin({ email: 's@example.com', password: TEST_PASSWORD, ip: '1.1.1.1', reactivate: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: s.id } })).accountStatus).toBe('ACTIVE');
  });
});

describe('sessions (G3)', () => {
  it('reflects status and admin changes immediately', async () => {
    const u = await createMember({ isAdmin: true });
    const token = await createSession(u.id);
    expect((await findSessionUser(token))?.isAdmin).toBe(true);
    await prisma.user.update({ where: { id: u.id }, data: { isAdmin: false, accountStatus: 'DEACTIVATED' } });
    const s = await findSessionUser(token);
    expect(s?.isAdmin).toBe(false);
    expect(s?.accountStatus).toBe('DEACTIVATED');
  });

  it('stores only a hash of the session token', async () => {
    const u = await createMember();
    const token = await createSession(u.id);
    expect(await prisma.session.count({ where: { tokenHash: token } })).toBe(0);
    expect(await prisma.session.count({ where: { tokenHash: sha256(token) } })).toBe(1);
  });
});

describe('password reset (Req 24)', () => {
  it('does not reveal unknown emails and resets + kills sessions for known ones', async () => {
    await requestPasswordReset('nobody@example.com');
    expect(await prisma.emailOutbox.count()).toBe(0);

    const u = await createMember({ email: 'ada@example.com' });
    const session = await createSession(u.id);
    await requestPasswordReset('ADA@example.com');
    const token = await tokenFromOutbox('password_reset', 'token');
    await resetPassword(token, 'BrandNew123');
    expect(await findSessionUser(session)).toBeNull();
    await expect(attemptLogin({ email: 'ada@example.com', password: 'BrandNew123', ip: '1.1.1.1' })).resolves.toMatchObject({ ok: true });
    await expect(resetPassword(token, 'Another123')).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });
});

describe('origin check (G4)', () => {
  const app = 'https://womenbuilders.com';
  it('accepts exact origin only', () => {
    expect(isAllowedOrigin('https://womenbuilders.com', null, app)).toBe(true);
    expect(isAllowedOrigin('https://womenbuilders.com.evil.io', null, app)).toBe(false);
    expect(isAllowedOrigin('http://womenbuilders.com', null, app)).toBe(false);
    expect(isAllowedOrigin(null, null, app)).toBe(false);
    expect(isAllowedOrigin(null, 'https://womenbuilders.com/settings', app)).toBe(true);
  });
});

describe('LinkedIn URLs (G18)', () => {
  it('canonicalizes common forms', () => {
    expect(canonicalLinkedInUrl('https://www.linkedin.com/in/Jane-Doe/')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(canonicalLinkedInUrl('linkedin.com/in/jane-doe?utm=x')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(canonicalLinkedInUrl('https://uk.linkedin.com/in/jane-doe')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(canonicalLinkedInUrl('https://linkedin.com.evil.io/in/jane')).toBeNull();
    expect(canonicalLinkedInUrl('https://www.linkedin.com/company/acme')).toBeNull();
  });
});
