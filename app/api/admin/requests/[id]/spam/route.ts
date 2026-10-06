import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { markRequestSpam } from '@/lib/services/invite-requests';
import { kickOutbox } from '@/lib/email/outbox';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { note } = await parseBody(req, z.object({ note: z.string().max(2000).optional() }));
  await markRequestSpam(admin.id, params.id!, note);
  kickOutbox();
  return { ok: true };
});
