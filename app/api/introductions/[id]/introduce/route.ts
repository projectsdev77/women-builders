import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { introduce, introduceSchema } from '@/lib/services/introductions';

export const POST = route(async (req, { params }) => {
  const user = await apiActiveUser();
  const { note } = await parseBody(req, introduceSchema);
  await introduce(user.id, params.id!, note);
  kickOutbox();
  return { ok: true };
});
