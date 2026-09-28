import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { listConversations } from '@/lib/services/messaging';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return { conversations: await listConversations(user.id) };
});
