import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { setShowcase } from '@/lib/services/showcase';

export const PUT = route(async (req) => {
  const admin = await apiAdmin();
  const { ids } = await parseBody(req, z.object({ ids: z.array(z.string()).max(6) }));
  await setShowcase(admin.id, ids);
  return { ok: true };
});
