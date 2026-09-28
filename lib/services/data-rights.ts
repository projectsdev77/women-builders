import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { verifyPassword } from '@/lib/auth/password';

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

/**
 * Permanent deletion (Req 25.2–25.3 R2). Deletes the account, profile, requests, connections
 * and every conversation with this member (for both sides). Reports about or by the member
 * are kept, with the account link removed, so deletion can't erase safety history.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await confirmPassword(userId, password);
  if (user.isAdmin) {
    const others = await prisma.user.count({ where: { isAdmin: true, accountStatus: 'ACTIVE', id: { not: userId } } });
    if (others === 0) throw Errors.validation("You're the last admin. Make someone else an admin before deleting your account.");
  }
  await prisma.$transaction([
    prisma.potentialMember.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
