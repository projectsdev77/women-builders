import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { gatheringInputSchema, getGatheringForEdit, updateGathering } from '@/lib/services/admin/gatherings';

export const GET = route(async (_req, { params }) => {
  await apiAdmin();
  return getGatheringForEdit(params.id!);
});

export const PATCH = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const res = await updateGathering(admin.id, params.id!, await parseBody(req, gatheringInputSchema));
  kickOutbox();
  return res;
});
