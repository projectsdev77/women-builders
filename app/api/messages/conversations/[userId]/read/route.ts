import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { markConversationRead } from '@/lib/services/messaging';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  return markConversationRead(user.id, params.userId!);
});
