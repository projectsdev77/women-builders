import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { peopleYouMet } from '@/lib/services/gatherings';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return { people: await peopleYouMet(user.id) };
});
