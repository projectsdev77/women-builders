import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { deleteWin } from '@/lib/services/wins';

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await deleteWin(user.id, params.id!);
  return { ok: true };
});
