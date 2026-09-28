import { route } from '@/lib/api';
import { apiUser } from '@/lib/auth/guards';
import { resendVerification } from '@/lib/services/accounts';
import { kickOutbox } from '@/lib/email/outbox';

export const POST = route(async () => {
  const user = await apiUser();
  await resendVerification(user.id);
  kickOutbox();
  return { ok: true };
});
