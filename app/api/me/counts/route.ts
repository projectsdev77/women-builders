import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

/** Badge counts for navigation (polled). */
export const GET = route(async () => {
  const user = await apiActiveUser();
  const [unread, pendingRequests] = await Promise.all([
    prisma.message.count({
      where: { receiverId: user.id, readAt: null, connection: { removedAt: null } },
    }),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING' } }),
  ]);
  return { unread, pendingRequests };
});
