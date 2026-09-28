import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { sendMessage } from '@/lib/services/messaging';
import { kickOutbox } from '@/lib/email/outbox';
import { LIMITS } from '@/lib/config';

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const body = await parseBody(
    req,
    z.object({
      receiverId: z.string().min(1).max(50),
      content: z.string().trim().min(1, 'Write a message first').max(LIMITS.messageMax),
    }),
  );
  const message = await sendMessage(user.id, body.receiverId, body.content);
  kickOutbox();
  return { message };
});
