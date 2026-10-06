import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { acceptCharter } from '@/lib/services/charter';

export const POST = route(async () => {
  const user = await apiActiveUser();
  await acceptCharter(user.id);
  return { ok: true };
});
