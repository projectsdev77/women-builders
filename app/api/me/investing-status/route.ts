import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { setInvestingStatus } from '@/lib/services/investing';

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const { investing } = await parseBody(req, z.object({ investing: z.boolean() }));
  return setInvestingStatus(user.id, investing);
});
