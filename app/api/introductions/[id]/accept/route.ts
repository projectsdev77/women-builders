import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { acceptIntroduction } from '@/lib/services/introductions';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  const res = await acceptIntroduction(user.id, params.id!);
  kickOutbox();
  return res ?? { ok: true };
});
