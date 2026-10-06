import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { cancelGathering } from '@/lib/services/admin/gatherings';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { reason } = await parseBody(req, z.object({ reason: z.string().trim().min(3, 'Tell people why').max(1000) }));
  await cancelGathering(admin.id, params.id!, reason);
  kickOutbox();
  return { ok: true };
});
