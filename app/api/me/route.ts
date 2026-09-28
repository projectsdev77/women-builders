import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth/session';
import { deleteAccount } from '@/lib/services/data-rights';
import { apiUser, homeFor } from '@/lib/auth/guards';

export const GET = route(async () => {
  const user = await apiUser();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    accountStatus: user.accountStatus,
    emailVerified: !!user.emailVerifiedAt,
    home: homeFor(user),
  };
});

/** Permanently delete my account (Req 25.2). Requires the password. */
export const DELETE = route(async (req) => {
  const user = await apiUser();
  const { password } = await parseBody(req, z.object({ password: z.string().min(1, 'Enter your password') }));
  await deleteAccount(user.id, password);
  clearSessionCookie();
  return { ok: true };
});
