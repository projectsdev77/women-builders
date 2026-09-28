import type { RoleType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { DURATIONS_MS, appUrl } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { deleteUserSessions } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { normalizeEmail } from '@/lib/validation/common';
import { calculateCompleteness } from './profile-fields';
import { changeProspectStatus } from './prospect-status';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  primaryRole: RoleType;
  headline: string;
  applicationStatement: string;
  invitationToken?: string;
}

export type RegisterResult = { userId: string; status: 'PENDING' | 'ACTIVE' };

/**
 * Registration (Req 18, G10, G11):
 * - Profile row created immediately (G15).
 * - With a valid invitation for this email: ACTIVE right away (email verified by the token).
 * - Otherwise: PENDING and a verification email; only verified applications reach admins.
 * - A matching prospect is linked and moved to APPLIED (or APPROVED via invitation).
 * - A REJECTED email may re-apply after 90 days (the row is recycled).
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    let invitation = null as null | { id: string; potentialMemberId: string | null };
    if (input.invitationToken) {
      const inv = await tx.invitation.findUnique({
        where: { tokenHash: sha256(input.invitationToken) },
      });
      if (!inv || inv.usedAt || inv.revokedAt || inv.expiresAt < new Date()) {
        throw new AppError('INVALID_INVITATION', 'This invitation link is invalid or has expired.', 400);
      }
      if (inv.email !== email) {
        throw new AppError(
          'INVITATION_EMAIL_MISMATCH',
          'Please register with the email address the invitation was sent to.',
          400,
        );
      }
      invitation = inv;
    }

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      const canReapply =
        existing.accountStatus === 'REJECTED' &&
        !!existing.rejectedAt &&
        Date.now() - existing.rejectedAt.getTime() >= DURATIONS_MS.reapplyAfterRejection;
      if (!canReapply) {
        throw new AppError('EMAIL_TAKEN', 'An account with this email is already registered.', 409);
      }
      await tx.user.delete({ where: { id: existing.id } });
    }

    const active = !!invitation;
    const now = new Date();
    const profileData = {
      primaryRole: input.primaryRole,
      secondaryRoles: [] as RoleType[],
      headline: input.headline.trim() || null,
    };
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: input.name.trim(),
        applicationStatement: input.applicationStatement.trim() || null,
        accountStatus: active ? 'ACTIVE' : 'PENDING',
        emailVerifiedAt: active ? now : null,
        approvedAt: active ? now : null,
        profile: {
          create: {
            ...profileData,
            completenessScore: calculateCompleteness(profileData),
          },
        },
        notificationPreference: { create: {} },
      },
    });

    if (invitation) {
      await tx.invitation.update({ where: { id: invitation.id }, data: { usedAt: now } });
    }

    // Link to an existing prospect record (G10).
    const prospect = await tx.potentialMember.findFirst({
      where: invitation?.potentialMemberId
        ? { id: invitation.potentialMemberId }
        : { email, userId: null },
    });
    if (prospect && prospect.outreachStatus !== 'DO_NOT_CONTACT') {
      await tx.potentialMember.update({ where: { id: prospect.id }, data: { userId: user.id } });
      await changeProspectStatus(tx, prospect.id, 'APPLIED', null);
      if (active) await changeProspectStatus(tx, prospect.id, 'APPROVED', null);
    }

    if (!active) await issueVerification(tx, user.id, user.email, user.name);
    else await enqueueEmail(tx, { to: user.email, kind: 'welcome', content: templates.welcome(user.name) });

    return { userId: user.id, status: active ? 'ACTIVE' : 'PENDING' };
  });
}

type Db = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function issueVerification(db: Db, userId: string, email: string, name: string) {
  const token = randomToken();
  await db.authToken.create({
    data: {
      tokenHash: sha256(token),
      purpose: 'EMAIL_VERIFICATION',
      userId,
      expiresAt: new Date(Date.now() + DURATIONS_MS.emailVerification),
    },
  });
  await enqueueEmail(db, {
    to: email,
    kind: 'verify_email',
    content: templates.verifyEmail(name, `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`),
  });
}

async function consumeToken(token: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('INVALID_TOKEN', 'This link is invalid or has expired.', 400);
  }
  const used = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (used.count === 0) throw new AppError('INVALID_TOKEN', 'This link has already been used.', 400);
  return record;
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await consumeToken(token, 'EMAIL_VERIFICATION');
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User');
  if (user.emailVerifiedAt) return;
  const recent = await prisma.authToken.count({
    where: {
      userId,
      purpose: 'EMAIL_VERIFICATION',
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= 3) throw Errors.rateLimited('Please wait a while before requesting another email.');
  await prisma.$transaction((tx) => issueVerification(tx, user.id, user.email, user.name));
}

/** Always succeeds from the caller's point of view (no enumeration) (G11). */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const recent = await prisma.authToken.count({
    where: {
      userId: user.id,
      purpose: 'PASSWORD_RESET',
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= 3) return;
  const token = randomToken();
  await prisma.$transaction(async (tx) => {
    await tx.authToken.create({
      data: {
        tokenHash: sha256(token),
        purpose: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt: new Date(Date.now() + DURATIONS_MS.passwordReset),
      },
    });
    await enqueueEmail(tx, {
      to: user.email,
      kind: 'password_reset',
      content: templates.passwordReset(`${appUrl()}/reset-password?token=${encodeURIComponent(token)}`),
    });
  });
}

/** Resets the password, ends all sessions and clears login blocks (Req 24.3). */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await consumeToken(token, 'PASSWORD_RESET');
  const user = await prisma.user.update({
    where: { id: record.userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      lockedUntil: null,
      // Following the link proves control of the inbox.
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.loginAttempt.deleteMany({ where: { email: user.email, success: false } });
  await deleteUserSessions(user.id);
}

export async function changePassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw Errors.validation('Current password is incorrect.', {
      fieldErrors: { currentPassword: ['Current password is incorrect.'] },
    });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), lockedUntil: null },
  });
  await deleteUserSessions(userId, currentSessionId);
}
