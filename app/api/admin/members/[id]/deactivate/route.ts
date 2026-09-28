import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { deactivateMember } from '@/lib/services/admin/members';
import { kickOutbox } from '@/lib/email/outbox';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { reason } = await parseBody(req, z.object({ reason: z.string().max(2000).optional() }));
  await deactivateMember(admin.id, params.id!, reason);
  kickOutbox();
  return { ok: true };
});
