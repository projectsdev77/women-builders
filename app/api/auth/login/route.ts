import { z } from 'zod';
import { route, parseBody, clientIp } from '@/lib/api';
import { attemptLogin } from '@/lib/auth/login';
import { createSession, findSessionUser, setSessionCookie } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(254),
  password: z.string().min(1, 'Password is required').max(200),
  reactivate: z.boolean().optional(),
});

export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  const result = await attemptLogin({ ...input, ip: clientIp(req) });
  if (!result.ok) return { status: result.code };
  const token = await createSession(result.userId, req.headers.get('user-agent'));
  setSessionCookie(token);
  const user = await findSessionUser(token);
  return { status: 'OK', redirectTo: user ? homeFor(user) : '/dashboard' };
});
