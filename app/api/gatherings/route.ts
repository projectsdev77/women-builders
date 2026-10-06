import { route, parseQuery } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { gatheringListSchema, listGatherings } from '@/lib/services/gatherings';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  return { gatherings: await listGatherings(user.id, parseQuery(req, gatheringListSchema)) };
});
