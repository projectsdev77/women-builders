import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { listConnections } from '@/lib/services/connections';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  return { connections: await listConnections(user.id, req.nextUrl.searchParams.get('q')?.slice(0, 100) ?? '') };
});
