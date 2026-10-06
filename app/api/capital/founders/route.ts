import { route, parseQuery } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { foundersQuerySchema, listRaisingFounders } from '@/lib/services/capital';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  return listRaisingFounders(user.id, parseQuery(req, foundersQuerySchema));
});
