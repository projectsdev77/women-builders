import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { whosComing } from '@/lib/services/gatherings';

export const GET = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  return whosComing(user.id, params.id!);
});
