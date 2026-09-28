import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { listRequests, sendConnectionRequest } from '@/lib/services/connections';
import { kickOutbox } from '@/lib/email/outbox';
import { LIMITS } from '@/lib/config';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return listRequests(user.id);
});

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const body = await parseBody(
    req,
    z.object({
      receiverId: z.string().min(1).max(50),
      message: z.string().max(LIMITS.connectionRequestMessageMax, `Keep your note under ${LIMITS.connectionRequestMessageMax} characters`).optional(),
    }),
  );
  const result = await sendConnectionRequest(user.id, body.receiverId, body.message);
  kickOutbox();
  return result;
});
