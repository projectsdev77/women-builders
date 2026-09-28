import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { declineConnectionRequest } from '@/lib/services/connections';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await declineConnectionRequest(user.id, params.id!);
  return { ok: true };
});
