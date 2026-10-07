import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { respondToWin } from '@/lib/services/wins';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await respondToWin(user.id, params.id!, true);
  return { ok: true };
});
