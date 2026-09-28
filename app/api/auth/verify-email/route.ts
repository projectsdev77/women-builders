import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { verifyEmail } from '@/lib/services/accounts';

export const POST = route(async (req) => {
  const { token } = await parseBody(req, z.object({ token: z.string().min(1).max(200) }));
  await verifyEmail(token);
  return { ok: true };
});
