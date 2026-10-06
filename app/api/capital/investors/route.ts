import { route, parseQuery } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { investorsQuerySchema, listInvestors } from '@/lib/services/capital';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  return listInvestors(user.id, parseQuery(req, investorsQuerySchema));
});
