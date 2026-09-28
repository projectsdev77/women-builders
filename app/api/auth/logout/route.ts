import { cookies } from 'next/headers';
import { route } from '@/lib/api';
import { SESSION_COOKIE, clearSessionCookie, deleteSessionByToken } from '@/lib/auth/session';

export const POST = route(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionByToken(token);
  clearSessionCookie();
  return { ok: true };
});
