import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { DURATIONS_MS, LOGIN } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { normalizeEmail } from '@/lib/validation/common';
import { getDummyHash, verifyPassword } from './password';

export const INVALID_CREDENTIALS = 'Email or password is incorrect.';

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; code: 'REACTIVATION_AVAILABLE' };

/**
 * Credential check with abuse protection (G7):
 * - 5 failures for (email, ip) in 15 min → that ip is blocked for that email for 15 min.
 * - 50 failures for an email in 1 hour from any ip → account locked for 15 min, owner emailed.
 * - Unknown email, wrong password and locked account return the same message, and
 *   bcrypt always runs, so neither the message nor the timing reveals membership.
 */
export async function attemptLogin(input: {
  email: string;
  password: string;
  ip: string;
  reactivate?: boolean;
}): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const now = Date.now();

  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { email, ip: input.ip, success: true },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const windowStart = new Date(
    Math.max(now - DURATIONS_MS.loginWindow, lastSuccess?.createdAt.getTime() ?? 0),
  );
  const recentFailures = await prisma.loginAttempt.count({
    where: { email, ip: input.ip, success: false, createdAt: { gt: windowStart } },
  });
  if (recentFailures >= LOGIN.maxFailuresPerEmailIp) {
    throw new AppError(
      'TOO_MANY_ATTEMPTS',
      'Too many attempts. Try again in 15 minutes, or reset your password.',
      429,
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? getDummyHash());
  const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > now;

  if (!user || !passwordOk || locked) {
    await prisma.loginAttempt.create({ data: { email, ip: input.ip, success: false } });
    if (user && !locked) {
      const globalFailures = await prisma.loginAttempt.count({
        where: {
          email,
          success: false,
          createdAt: { gt: new Date(now - DURATIONS_MS.globalLoginWindow) },
        },
      });
      if (globalFailures >= LOGIN.maxFailuresPerEmailGlobal) {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: { lockedUntil: new Date(now + DURATIONS_MS.loginBlock) },
          });
          await enqueueEmail(tx, {
            to: user.email,
            kind: 'suspicious_logins',
            content: templates.suspiciousLogins(),
          });
        });
      }
    }
    throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS, 401);
  }

  // Past this point the password is correct, so status messages don't leak anything.
  if (user.accountStatus === 'REJECTED') {
    throw new AppError(
      'APPLICATION_REJECTED',
      "Your application wasn't approved. You can apply again 90 days after the decision.",
      403,
    );
  }
  if (user.accountStatus === 'DEACTIVATED') {
    if (user.deactivatedBy !== 'SELF') {
      throw new AppError(
        'ACCOUNT_DEACTIVATED',
        'This account has been deactivated by the Women Builders team. Contact us if you think this is a mistake.',
        403,
      );
    }
    if (!input.reactivate) return { ok: false, code: 'REACTIVATION_AVAILABLE' };
    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: 'ACTIVE', deactivatedBy: null },
    });
  }

  await prisma.loginAttempt.create({ data: { email, ip: input.ip, success: true } });
  return { ok: true, userId: user.id };
}
