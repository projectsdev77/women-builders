import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { gatheringQueue } from '@/lib/services/admin/gatherings';

export const GET = route(async (_req, { params }) => {
  await apiAdmin();
  return gatheringQueue(params.id!);
});
