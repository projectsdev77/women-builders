import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { removeConnection } from '@/lib/services/connections';

/** Remove a connection (Req 21.6). */
export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await removeConnection(user.id, params.memberId!);
  return { ok: true };
});
