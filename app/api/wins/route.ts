import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { logWin, myWins, winSchema } from '@/lib/services/wins';

export const GET = route(async () => {
  const user = await apiActiveUser();
  return myWins(user.id);
});

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const res = await logWin(user.id, await parseBody(req, winSchema));
  kickOutbox();
  return res;
});
