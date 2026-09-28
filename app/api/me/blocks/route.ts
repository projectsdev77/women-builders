import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { listBlocked } from '@/lib/services/safety';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return { blocked: await listBlocked(user.id) };
});
