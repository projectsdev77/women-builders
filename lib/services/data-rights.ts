import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { verifyPassword } from '@/lib/auth/password';
import { removeProfilePhoto } from './photos';

async function confirmPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('User');
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError('VALIDATION_ERROR', 'Password is incorrect.', 400, { fieldErrors: { password: ['Password is incorrect.'] } });
  }
  return user;
}

/** Everything we hold about the member (Req 25.1). Other members' private data is excluded. */
export async function exportMemberData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      notificationPreference: true,
      sentRequests: { select: { receiverId: true, message: true, status: true, createdAt: true } },
      receivedRequests: { select: { senderId: true, message: true, status: true, createdAt: true } },
      sentMessages: { select: { receiverId: true, content: true, createdAt: true, readAt: true } },
      receivedMessages: { select: { senderId: true, content: true, createdAt: true, readAt: true } },
      blocksMade: { select: { blockedId: true, createdAt: true } },
      reportsMade: { select: { reportedUserName: true, reason: true, details: true, status: true, createdAt: true } },
      dismissals: { select: { dismissedUserId: true, dismissedAt: true } },
    },
  });
  if (!user) throw Errors.notFound('User');
  const connections = await prisma.connection.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: { select: { id: true, name: true } }, userB: { select: { id: true, name: true } } },
  });
  const { passwordHash: _p, lockedUntil: _l, reviewNote: _r, ...account } = user;
  return {
    exportedAt: new Date().toISOString(),
    account,
    connections: connections.map((c) => {
      const other = c.userAId === userId ? c.userB : c.userA;
      return { memberId: other.id, name: other.name, connectedAt: c.createdAt, removedAt: c.removedAt };
    }),
  };
}

/** Self-deactivation (Req 9.5): hidden everywhere, reactivated by logging in again. */
export async function deactivateSelf(userId: string, password: string) {
  await confirmPassword(userId, password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { accountStatus: 'DEACTIVATED', deactivatedBy: 'SELF' } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

export const DELETED_ACCOUNT_NAME = 'Deleted account';

/**
 * Account deletion, Telegram style (Req 25.2-25.4 R2): everything that identifies the person
 * is erased, but the conversations stay. The other person keeps their history, now shown as
 * coming from "Deleted account" and read-only. The user row itself is kept as an anonymous
 * shell so those conversations, and any reports about the member, stay intact for
 * accountability. The email address is released, so it can be used to register again.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await confirmPassword(userId, password);
  if (user.isAdmin) {
    const others = await prisma.user.count({ where: { isAdmin: true, accountStatus: 'ACTIVE', id: { not: userId } } });
    if (others === 0) throw Errors.validation("You're the last admin. Make someone else an admin before deleting your account.");
  }
  // Photo files live outside the database, so remove them first (R3 F19).
  await removeProfilePhoto(userId);
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.authToken.deleteMany({ where: { userId } }),
    prisma.loginAttempt.deleteMany({ where: { email: user.email } }),
    prisma.emailOutbox.deleteMany({ where: { to: user.email } }),
    prisma.invitation.deleteMany({ where: { email: user.email } }),
    prisma.profile.deleteMany({ where: { userId } }),
    prisma.notificationPreference.deleteMany({ where: { userId } }),
    prisma.connectionRequest.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    prisma.dismissedRecommendation.deleteMany({ where: { OR: [{ userId }, { dismissedUserId: userId }] } }),
    prisma.block.deleteMany({ where: { blockerId: userId } }),
    prisma.potentialMember.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'DELETED',
        deactivatedBy: null,
        name: DELETED_ACCOUNT_NAME,
        // Unique, unroutable placeholder; the real address becomes free to register again.
        email: `deleted-${userId}@deleted.invalid`,
        passwordHash: '!',
        isAdmin: false,
        applicationStatement: null,
        reviewNote: null,
        lockedUntil: null,
        emailVerifiedAt: null,
      },
    }),
  ]);
}
