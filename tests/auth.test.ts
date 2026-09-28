import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { attemptLogin, INVALID_CREDENTIALS } from '@/lib/auth/login';
import { createSession, findSessionUser } from '@/lib/auth/session';
import {
  register,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '@/lib/services/accounts';
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
  applicationStatement: 'Building an analytical engine for everyone.',
};

async function tokenFromOutbox(kind: string, param: string) {
  const email = await prisma.emailOutbox.findFirstOrThrow({ where: { kind }, orderBy: { createdAt: 'desc' } });
  const m = email.text.match(new RegExp(`${param}=([^\\s]+)`));
  return decodeURIComponent(m![1]!);
}

beforeEach(resetDb);

describe('registration (Req 18, G10, G11, G15)', () => {
  it('creates a PENDING account with a profile, normalized email and a verification email', async () => {
    const res = await register({ ...base, email: '  Ada@Example.COM ' });
    expect(res.status).toBe('PENDING');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.userId }, include: { profile: true } });
    expect(user.email).toBe('ada@example.com');
    expect(user.profile?.primaryRole).toBe('BUILDER');
    expect(user.profile?.completenessScore).toBeGreaterThan(0);
    expect(await prisma.emailOutbox.count({ where: { kind: 'verify_email', to: 'ada@example.com' } })).toBe(1);
  });

  it('rejects duplicate emails case-insensitively', async () => {
    await register({ ...base, email: 'ada@example.com' });
    await expect(register({ ...base, email: 'ADA@example.com' })).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('verifies email with a single-use token', async () => {
    const { userId } = await register({ ...base, email: 'ada@example.com' });
    const token = await tokenFromOutbox('verify_email', 'token');
    await verifyEmail(token);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).not.toBeNull();
    await expect(verifyEmail(token)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('activates immediately with a valid invitation and marks the prospect APPROVED', async () => {
    const token = randomToken();
    const prospect = await prisma.potentialMember.create({
      data: { name: 'Ada', email: 'ada@example.com', outreachStatus: 'INVITED' },
    });
    await prisma.invitation.create({
      data: {
        email: 'ada@example.com',
        tokenHash: sha256(token),
        potentialMemberId: prospect.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const res = await register({ ...base, email: 'Ada@example.com', invitationToken: token });
    expect(res.status).toBe('ACTIVE');
    const p = await prisma.potentialMember.findUniqueOrThrow({ where: { id: prospect.id } });
    expect(p.userId).toBe(res.userId);
    expect(p.outreachStatus).toBe('APPROVED');
    const history = await prisma.potentialMemberStatusChange.findMany({ where: { potentialMemberId: prospect.id } });
    expect(history.map((h) => h.toStatus)).toEqual(['APPLIED', 'APPROVED']);
    await expect(register({ ...base, email: 'x@example.com', invitationToken: token })).rejects.toMatchObject({
      code: 'INVALID_INVITATION',
    });
  });

  it('rejects an invitation used with a different email', async () => {
    const token = randomToken();
    await prisma.invitation.create({
      data: { email: 'ada@example.com', tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86400000) },
    });
    await expect(register({ ...base, email: 'eve@example.com', invitationToken: token })).rejects.toMatchObject({
      code: 'INVITATION_EMAIL_MISMATCH',
    });
  });

  it('links a matching prospect and moves it to APPLIED', async () => {
    const p = await prisma.potentialMember.create({ data: { name: 'Ada', email: 'ada@example.com', outreachStatus: 'CONTACTED' } });
    await register({ ...base, email: 'ada@example.com' });
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: p.id } })).outreachStatus).toBe('APPLIED');
  });

  it('lets a rejected applicant re-apply only after 90 days', async () => {
    const u = await createMember({ email: 'ada@example.com', accountStatus: 'REJECTED' });
    await prisma.user.update({ where: { id: u.id }, data: { rejectedAt: new Date() } });
    await expect(register({ ...base, email: 'ada@example.com' })).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    await prisma.user.update({ where: { id: u.id }, data: { rejectedAt: new Date(Date.now() - 91 * 86400000) } });
    const res = await register({ ...base, email: 'ada@example.com' });
    expect(res.status).toBe('PENDING');
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

  it('lets PENDING users log in (they are routed to /pending)', async () => {
    await createMember({ email: 'p@example.com', accountStatus: 'PENDING' });
    await expect(attemptLogin({ email: 'p@example.com', password: TEST_PASSWORD, ip: '1.1.1.1' })).resolves.toMatchObject({ ok: true });
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
