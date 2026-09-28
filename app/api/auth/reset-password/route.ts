import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { resetPassword } from '@/lib/services/accounts';
import { passwordSchema } from '@/lib/validation/common';

export const POST = route(async (req) => {
  const { token, password } = await parseBody(
    req,
    z.object({ token: z.string().min(1).max(200), password: passwordSchema }),
  );
  await resetPassword(token, password);
  return { ok: true };
});
