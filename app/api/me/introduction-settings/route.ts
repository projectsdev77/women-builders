import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

const select = { allowIntroRequests: true, preferIntroductions: true } as const;

export const GET = route(async () => {
  const user = await apiActiveUser();
  return prisma.user.findUniqueOrThrow({ where: { id: user.id }, select });
});

export const PATCH = route(async (req) => {
  const user = await apiActiveUser();
  const data = await parseBody(req, z.object({ allowIntroRequests: z.boolean(), preferIntroductions: z.boolean() }).partial());
  return prisma.user.update({ where: { id: user.id }, data, select });
});
