import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { decideQuote } from '@/lib/services/showcase';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { approve } = await parseBody(req, z.object({ approve: z.boolean() }));
  await decideQuote(admin.id, params.id!, approve);
  return { ok: true };
});
