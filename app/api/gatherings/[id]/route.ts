import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { getGathering } from '@/lib/services/gatherings';

export const GET = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  return getGathering(user.id, params.id!);
});
