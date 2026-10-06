import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { createGathering, gatheringInputSchema, listAdminGatherings } from '@/lib/services/admin/gatherings';

export const GET = route(async (req) => {
  await apiAdmin();
  const view = req.nextUrl.searchParams.get('view') === 'past' ? 'past' : 'upcoming';
  return { gatherings: await listAdminGatherings(view) };
});

export const POST = route(async (req) => {
  const admin = await apiAdmin();
  const res = await createGathering(admin.id, await parseBody(req, gatheringInputSchema));
  kickOutbox();
  return res;
});
