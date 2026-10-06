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
import { lock } from './locks';
import { CHARTER_VERSION } from '@/content/charter';

export interface JoinInput {
  invitationToken: string;
  name: string;
  password: string;
  primaryRole: RoleType;
  headline: string;
  city: string | null;
  country: string;
  acceptCharter: true;
}

async function findLiveInvitation(db: Pick<typeof prisma, 'invitation'>, token: string) {
  const inv = await db.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { potentialMember: { include: { requests: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
  });
  if (!inv || inv.usedAt || inv.revokedAt || inv.expiresAt < new Date()) return null;
  return inv;
}

/** What the join page pre-fills from the invitation and its request (R3 F4). */
export async function previewInvitation(token: string) {
  const inv = await findLiveInvitation(prisma, token);
  if (!inv) return null;
  const request = inv.potentialMember?.requests[0];
  return {
    email: inv.email,
    name: request?.name ?? inv.potentialMember?.name ?? '',
    primaryRole: request?.primaryRole ?? null,
    city: request?.city ?? null,
    country: request?.country || null,
  };
}

/**
 * Joining is by invitation only (R3 F4). The invitation link proves the email address, so
 * the account is active immediately; the charter must be accepted; the prospect becomes
 * "Joined" (APPROVED).
 */
export async function joinWithInvitation(input: JoinInput): Promise<{ userId: string }> {
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const inv = await findLiveInvitation(tx, input.invitationToken);
    if (!inv) {
      throw new AppError('INVALID_INVITATION', 'This invitation has expired or has already been used.', 400);
    }
    await lock(tx, `join:${inv.email}`);
    const existing = await tx.user.findUnique({ where: { email: inv.email } });
    if (existing) throw new AppError('EMAIL_TAKEN', 'An account with this email already exists. Try logging in.', 409);

    const now = new Date();
    const profileData = {
      primaryRole: input.primaryRole,
      secondaryRoles: [] as RoleType[],
      headline: input.headline.trim() || null,
      city: input.city,
      country: input.country,
    };
    const user = await tx.user.create({
      data: {
        email: inv.email,
        passwordHash,
        name: input.name.trim(),
        accountStatus: 'ACTIVE',
        emailVerifiedAt: now,
        approvedAt: now,
        charterVersion: CHARTER_VERSION,
        charterAcceptedAt: now,
        charterNoticeVersion: CHARTER_VERSION,
        profile: { create: { ...profileData, completenessScore: calculateCompleteness(profileData) } },
        notificationPreference: { create: {} },
      },
    });
    await tx.invitation.update({ where: { id: inv.id }, data: { usedAt: now } });

    const prospect = inv.potentialMemberId
      ? await tx.potentialMember.findUnique({ where: { id: inv.potentialMemberId } })
      : await tx.potentialMember.findUnique({ where: { email: inv.email } });
    if (prospect && prospect.outreachStatus !== 'DO_NOT_CONTACT') {
      await tx.potentialMember.update({ where: { id: prospect.id }, data: { userId: user.id } });
      await changeProspectStatus(tx, prospect.id, 'APPROVED', null);
    }
    await enqueueEmail(tx, { to: user.email, kind: 'welcome', content: templates.welcome(user.name) });
    return { userId: user.id };
  });
}

async function consumeToken(token: string, purpose: 'PASSWORD_RESET') {
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
