import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { getRecommendations } from '@/lib/services/discovery';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return getRecommendations(user.id);
});
