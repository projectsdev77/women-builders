import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { reportMember } from '@/lib/services/safety';
import { LIMITS } from '@/lib/config';

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const body = await parseBody(
    req,
    z.object({
      memberId: z.string().min(1).max(50),
      reason: z.enum(['HARASSMENT', 'SPAM', 'FAKE_PROFILE', 'INAPPROPRIATE_CONTENT', 'OTHER'], {
        errorMap: () => ({ message: 'Choose a reason' }),
      }),
      details: z.string().max(LIMITS.reportDetailsMax).optional(),
      messageId: z.string().max(50).optional(),
    }),
  );
  return reportMember(user.id, body);
});
