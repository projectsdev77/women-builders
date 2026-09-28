import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiUser } from '@/lib/auth/guards';
import { changePassword } from '@/lib/services/accounts';
import { passwordSchema } from '@/lib/validation/common';

export const POST = route(async (req) => {
  const user = await apiUser();
  const { currentPassword, newPassword } = await parseBody(
    req,
    z.object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordSchema }),
  );
  await changePassword(user.id, user.sessionId, currentPassword, newPassword);
  return { ok: true };
});
