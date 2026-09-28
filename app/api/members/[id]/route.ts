import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { getMemberProfile } from '@/lib/services/profiles';

export const GET = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  return getMemberProfile(user.id, params.id!);
});
