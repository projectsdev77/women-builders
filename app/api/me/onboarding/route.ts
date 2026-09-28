import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { completeOnboarding } from '@/lib/services/profiles';

export const POST = route(async () => {
  const user = await apiActiveUser();
  await completeOnboarding(user.id);
  return { ok: true, redirectTo: '/dashboard' };
});
