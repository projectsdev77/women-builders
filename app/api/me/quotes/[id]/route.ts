import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { withdrawQuote } from '@/lib/services/showcase';

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await withdrawQuote(user.id, params.id!);
  return { ok: true };
});
