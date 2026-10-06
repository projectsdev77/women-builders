import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { cancelIntroduction } from '@/lib/services/introductions';

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await cancelIntroduction(user.id, params.id!);
  return { ok: true };
});
