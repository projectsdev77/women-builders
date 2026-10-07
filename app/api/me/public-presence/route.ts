import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { myPublicPresence, setShowcaseOptIn } from '@/lib/services/showcase';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return myPublicPresence(user.id);
});

export const PATCH = route(async (req) => {
  const user = await apiActiveUser();
  const { showcaseOptIn } = await parseBody(req, z.object({ showcaseOptIn: z.boolean() }));
  await setShowcaseOptIn(user.id, showcaseOptIn);
  return myPublicPresence(user.id);
});
