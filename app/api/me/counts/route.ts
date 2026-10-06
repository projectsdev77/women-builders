import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { introductionsAwaiting } from '@/lib/services/introductions';

/** Badge counts for navigation (polled). */
export const GET = route(async () => {
  const user = await apiActiveUser();
  const [unread, pendingRequests, introductions] = await Promise.all([
    prisma.message.count({
      where: { receiverId: user.id, readAt: null, connection: { removedAt: null } },
    }),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING' } }),
    introductionsAwaiting(user.id),
  ]);
  return { unread, pendingRequests, introductions };
});
