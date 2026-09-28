import { route, parseQuery } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { searchMembers, searchQuerySchema } from '@/lib/services/discovery';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  return searchMembers(user.id, parseQuery(req, searchQuerySchema));
});
