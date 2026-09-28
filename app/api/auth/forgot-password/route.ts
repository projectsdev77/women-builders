import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { requestPasswordReset } from '@/lib/services/accounts';
import { kickOutbox } from '@/lib/email/outbox';
import { emailSchema } from '@/lib/validation/common';

export const POST = route(async (req) => {
  const { email } = await parseBody(req, z.object({ email: emailSchema }));
  await requestPasswordReset(email);
  kickOutbox();
  // Same response whether or not the account exists (G11).
  return { ok: true };
});
