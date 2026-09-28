import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { cancelConnectionRequest } from '@/lib/services/connections';

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await cancelConnectionRequest(user.id, params.id!);
  return { ok: true };
});
