import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { getConversation } from '@/lib/services/messaging';

export const GET = route(async (req, { params }) => {
  const user = await apiActiveUser();
  return getConversation(user.id, params.userId!, { after: req.nextUrl.searchParams.get('after') ?? undefined });
});
