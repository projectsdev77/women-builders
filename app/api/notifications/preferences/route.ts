import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

const select = { connectionRequest: true, connectionAccepted: true, newMessage: true } as const;

export const GET = route(async () => {
  const user = await apiActiveUser();
  return prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, select });
});

export const PATCH = route(async (req) => {
  const user = await apiActiveUser();
  const data = await parseBody(
    req,
    z.object({ connectionRequest: z.boolean(), connectionAccepted: z.boolean(), newMessage: z.boolean() }).partial(),
  );
  return prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
    select,
  });
});
