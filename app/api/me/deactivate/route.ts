import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { clearSessionCookie } from '@/lib/auth/session';
import { deactivateSelf } from '@/lib/services/data-rights';

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const { password } = await parseBody(req, z.object({ password: z.string().min(1, 'Enter your password') }));
  await deactivateSelf(user.id, password);
  clearSessionCookie();
  return { ok: true };
});
