import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { introduceSchema, teamIntroduce } from '@/lib/services/introductions';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { note } = await parseBody(req, introduceSchema);
  await teamIntroduce(admin.id, params.id!, note);
  kickOutbox();
  return { ok: true };
});
