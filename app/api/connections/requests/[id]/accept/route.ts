import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { acceptConnectionRequest } from '@/lib/services/connections';
import { kickOutbox } from '@/lib/email/outbox';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  const result = await acceptConnectionRequest(user.id, params.id!);
  kickOutbox();
  return result;
});
